import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Runtime } from 'foldkit'

import { STORAGE_KEY } from './constant'
import { Message } from './message'
import { Model } from './model'
import { Workspace } from './page'
import { LoadCompanies, LoadFlowDefinitions } from './page/workspace/command'
import { subscriptions } from './subscription'
import { resetModel, update } from './update'
import { view } from './view'

// FLAGS

export const Flags = S.Struct({
  maybeSavedWorkspace: S.Option(Workspace.Model.SavedWorkspace),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* S.decodeEffect(
    S.fromJsonString(Workspace.Model.SavedWorkspace),
  )(json)
  return Flags.make({ maybeSavedWorkspace: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedWorkspace: Option.none() })),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

const targetCompanyIdVariable = (value: string): string | undefined => {
  const companyId = value.trim()

  return companyId === '' ? undefined : companyId
}

export const init: Runtime.ProgramInit<Model, Message, Flags> = flags => {
  const workspace = Workspace.init(flags.maybeSavedWorkspace)
  const companyId = targetCompanyIdVariable(workspace.targetCompanyId)

  if (companyId === undefined) {
    return [{ workspace }, [LoadCompanies()]]
  }

  return [
    { workspace },
    [
      LoadCompanies(),
      LoadFlowDefinitions({
        documentType: workspace.selectedFlowDocumentType,
        companyId,
      }),
    ],
  ]
}

export const defaultModel = (): Model => resetModel()

export { Message, Model, subscriptions, update, view }
