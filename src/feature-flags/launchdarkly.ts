import { createClient } from '@launchdarkly/js-client-sdk'
import { Effect } from 'effect'

const clientSideId = '68b17a9278b2ec09b742ed82'
const flowManagementFlagKey = 'flow-management-enabled'

export type FeatureFlagUser = {
  readonly key: string
  readonly companyId?: number
  readonly role?: string
}

export const isFlowManagementEnabled = (
  user: FeatureFlagUser,
): Effect.Effect<boolean, string> =>
  Effect.tryPromise({
    try: async () => {
      const client = createClient(clientSideId, {
        kind: 'user',
        key: user.key,
        companyId: user.companyId,
        role: user.role,
      })

      try {
        await client.start({ timeout: 5 })
        return Boolean(client.variation(flowManagementFlagKey, false))
      } finally {
        client.close()
      }
    },
    catch: error => {
      if (error instanceof Error) {
        return error.message
      }
      return 'failed to load feature flags'
    },
  })
