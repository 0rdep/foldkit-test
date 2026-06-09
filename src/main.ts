import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Runtime } from 'foldkit'

import { STORAGE_KEY } from './constant'
import { Message } from './message'
import { Model } from './model'
import { Workspace } from './page'
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

export const init: Runtime.ProgramInit<Model, Message, Flags> = flags => {
  return [{ workspace: Workspace.init(flags.maybeSavedWorkspace) }, []]
}

export const defaultModel = (): Model => resetModel()

export { Message, Model, subscriptions, update, view }
