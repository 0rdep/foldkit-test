import { Effect } from 'effect'

type GraphqlResponse<TData> = {
  readonly data?: TData
  readonly errors?: ReadonlyArray<{ readonly message: string }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isGraphqlResponse = <TData>(
  value: unknown,
): value is GraphqlResponse<TData> => isRecord(value)

const stringProperty = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const property = Reflect.get(value, key)

  return typeof property === 'string' ? property : undefined
}

const endpoint = (): string =>
  import.meta.env.VITE_PUNCT_GRAPHQL_URL ?? '/graphql'

const tokenFromAuthValue = (value: string): string => {
  try {
    const parsed: unknown = JSON.parse(value)

    if (!isRecord(parsed)) {
      return value
    }

    const token =
      stringProperty(parsed, 'accessToken') ??
      stringProperty(parsed, 'idToken') ??
      stringProperty(parsed, 'token')

    if (token !== undefined) {
      return token
    }
  } catch {
    return value
  }

  return value
}

const authorizationHeader = (): Record<string, string> => {
  const auth = globalThis.localStorage?.getItem('auth')

  if (!auth) {
    return {}
  }

  const token = tokenFromAuthValue(auth)

  return {
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  }
}

export const request = <TData, TVariables>(
  query: string,
  variables: TVariables,
): Effect.Effect<TData, string> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authorizationHeader(),
        },
        body: JSON.stringify({ query, variables }),
      })

      if (!response.ok) {
        throw new Error(`GraphQL request failed with ${response.status}`)
      }

      const payload: unknown = await response.json()

      if (!isGraphqlResponse<TData>(payload)) {
        throw new Error('GraphQL response was not an object')
      }

      if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors.map(error => error.message).join('\n'))
      }

      if (!payload.data) {
        throw new Error('GraphQL response did not include data')
      }

      return payload.data
    },
    catch: error => {
      if (error instanceof Error) {
        return error.message
      }
      return 'GraphQL request failed'
    },
  })
