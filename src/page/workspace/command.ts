import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { STORAGE_KEY } from '../../constant'
import { Workflow } from '../../domain'
import { CompletedSaveWorkspace } from './message'
import { SavedWorkspace } from './model'

export const SaveWorkspace = Command.define(
  'SaveWorkspace',
  {
    workflow: Workflow.WorkflowDefinition,
    actors: S.Array(Workflow.Actor),
    documents: S.Array(Workflow.DocumentInstance),
    nextSequence: S.Number,
  },
  CompletedSaveWorkspace,
)(workspace =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      STORAGE_KEY,
      S.encodeSync(S.fromJsonString(SavedWorkspace))(workspace),
    )
    return CompletedSaveWorkspace()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveWorkspace())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)
