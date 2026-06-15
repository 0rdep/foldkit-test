import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { STORAGE_KEY } from '../../constant'
import { Workflow } from '../../domain'
import * as Graphql from '../../graphql/client'
import {
  toUpdateFlowDraftInput,
  toWorkflowDefinition,
} from '../../graphql/flow-adapter'
import type { FlowDocumentType, UpdateFlowDraftInput } from '../../graphql/generated'
import type {
  FlowDefinitionFieldsFragment,
  FlowDefinitionsQuery,
  FlowDefinitionsQueryVariables,
} from '../../graphql/operations-generated'
import {
  FlowDefinitionsQueryText,
  PublishFlowMutationText,
  UpdateFlowDraftMutationText,
} from '../../graphql/operations'
import {
  CompletedSaveWorkspace,
  FailedLoadFlowDefinitions,
  FailedSaveFlowDraft,
  FailedPublishFlow,
  SucceededLoadFlowDefinitions,
  SucceededPublishFlow,
  SucceededSaveFlowDraft,
} from './message'
import { SavedWorkspace } from './model'

type UpdateFlowDraftResponse = {
  readonly Flow: {
    readonly updateDraft: FlowDefinitionFieldsFragment
  }
}

type UpdateFlowDraftVariables = {
  readonly flowId: string
  readonly input: UpdateFlowDraftInput
}

type PublishFlowResponse = {
  readonly Flow: {
    readonly publish: FlowDefinitionFieldsFragment
  }
}

type PublishFlowVariables = {
  readonly flowId: string
}

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

export const LoadFlowDefinitions = Command.define(
  'LoadFlowDefinitions',
  { documentType: S.Literals(['requisition', 'order']) },
  S.Union([SucceededLoadFlowDefinitions, FailedLoadFlowDefinitions]),
)(({ documentType }) =>
  Graphql.request<FlowDefinitionsQuery, FlowDefinitionsQueryVariables>(
    FlowDefinitionsQueryText,
    { documentType: documentType as FlowDocumentType },
  ).pipe(
    Effect.map(data =>
      SucceededLoadFlowDefinitions({
        definitions: data.Flow.definitions.map(toWorkflowDefinition),
      }),
    ),
    Effect.catch((error: string) =>
      Effect.succeed(FailedLoadFlowDefinitions({ error })),
    ),
  ),
)

export const SaveFlowDraft = Command.define(
  'SaveFlowDraft',
  { flowId: S.String, workflow: Workflow.WorkflowDefinition },
  S.Union([SucceededSaveFlowDraft, FailedSaveFlowDraft]),
)(({ flowId, workflow }) =>
  Graphql.request<UpdateFlowDraftResponse, UpdateFlowDraftVariables>(
    UpdateFlowDraftMutationText,
    { flowId, input: toUpdateFlowDraftInput(workflow) },
  ).pipe(
    Effect.map(data =>
      SucceededSaveFlowDraft({
        workflow: toWorkflowDefinition(data.Flow.updateDraft),
      }),
    ),
    Effect.catch((error: string) =>
      Effect.succeed(FailedSaveFlowDraft({ error })),
    ),
  ),
)

export const PublishFlow = Command.define(
  'PublishFlow',
  { flowId: S.String, workflow: Workflow.WorkflowDefinition },
  S.Union([SucceededPublishFlow, FailedPublishFlow]),
)(({ flowId, workflow }) =>
  Graphql.request<UpdateFlowDraftResponse, UpdateFlowDraftVariables>(
    UpdateFlowDraftMutationText,
    { flowId, input: toUpdateFlowDraftInput(workflow) },
  ).pipe(
    Effect.flatMap(data =>
      Graphql.request<PublishFlowResponse, PublishFlowVariables>(
        PublishFlowMutationText,
        { flowId: data.Flow.updateDraft.id },
      ),
    ),
    Effect.map(data =>
      SucceededPublishFlow({
        workflow: toWorkflowDefinition(data.Flow.publish),
      }),
    ),
    Effect.catch((error: string) =>
      Effect.succeed(FailedPublishFlow({ error })),
    ),
  ),
)
