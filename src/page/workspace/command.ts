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
import type { UpdateFlowDraftInput } from '../../graphql/generated'
import {
  CompanyFindManyQueryText,
  FlowDefinitionHistoryQueryText,
  FlowDefinitionsQueryText,
  PublishFlowMutationText,
  UpdateFlowDraftMutationText,
} from '../../graphql/operations'
import type {
  CompanyFindManyQuery,
  FlowDefinitionFieldsFragment,
  FlowDefinitionHistoryQuery,
  FlowDefinitionHistoryQueryVariables,
  FlowDefinitionsQuery,
  FlowDefinitionsQueryVariables,
} from '../../graphql/operations-generated'
import {
  CompletedSaveWorkspace,
  FailedCopyWorkflowExportJson,
  FailedLoadCompanies,
  FailedLoadFlowDefinitions,
  FailedLoadFlowHistory,
  FailedPublishFlow,
  FailedSaveFlowDraft,
  SucceededCopyWorkflowExportJson,
  SucceededLoadCompanies,
  SucceededLoadFlowDefinitions,
  SucceededLoadFlowHistory,
  SucceededPublishFlow,
  SucceededSaveFlowDraft,
} from './message'
import { FlowDocumentType, SavedWorkspace } from './model'

type UpdateFlowDraftResponse = {
  readonly Flow: {
    readonly updateDraft: FlowDefinitionFieldsFragment
  }
}

type UpdateFlowDraftVariables = {
  readonly flowId: string
  readonly input: UpdateFlowDraftInput
  readonly companyId?: string | undefined
}

type PublishFlowResponse = {
  readonly Flow: {
    readonly publish: FlowDefinitionFieldsFragment
  }
}

type PublishFlowVariables = {
  readonly flowId: string
  readonly companyId?: string | undefined
}

type EmptyVariables = Record<string, never>

export const SaveWorkspace = Command.define(
  'SaveWorkspace',
  {
    workflow: Workflow.WorkflowDefinition,
    flowHistory: S.Array(Workflow.WorkflowDefinition),
    targetCompanyId: S.String,
    selectedFlowDocumentType: FlowDocumentType,
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

export const CopyWorkflowExportJson = Command.define(
  'CopyWorkflowExportJson',
  { value: S.String },
  SucceededCopyWorkflowExportJson,
  FailedCopyWorkflowExportJson,
)(({ value }) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(value),
    catch: () => new Error('Failed to copy workflow JSON'),
  }).pipe(
    Effect.as(SucceededCopyWorkflowExportJson()),
    Effect.catch(() => Effect.succeed(FailedCopyWorkflowExportJson())),
  ),
)

export const LoadFlowDefinitions = Command.define(
  'LoadFlowDefinitions',
  {
    documentType: S.Literals(['requisition', 'order']),
    companyId: S.optional(S.String),
  },
  S.Union([SucceededLoadFlowDefinitions, FailedLoadFlowDefinitions]),
)(({ documentType, companyId }) =>
  Graphql.request<FlowDefinitionsQuery, FlowDefinitionsQueryVariables>(
    FlowDefinitionsQueryText,
    { documentType, companyId: companyId ?? null },
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

export const LoadCompanies = Command.define(
  'LoadCompanies',
  S.Union([SucceededLoadCompanies, FailedLoadCompanies]),
)(
  Graphql.request<CompanyFindManyQuery, EmptyVariables>(
    CompanyFindManyQueryText,
    {},
  ).pipe(
    Effect.map(data =>
      SucceededLoadCompanies({
        companies: data.Company.findMany.items.map(company => ({
          id: company.id,
          name: company.name,
          active: company.active,
        })),
      }),
    ),
    Effect.catch((error: string) =>
      Effect.succeed(FailedLoadCompanies({ error })),
    ),
  ),
)

export const LoadFlowHistory = Command.define(
  'LoadFlowHistory',
  { flowId: S.String, companyId: S.optional(S.String) },
  S.Union([SucceededLoadFlowHistory, FailedLoadFlowHistory]),
)(({ flowId, companyId }) =>
  Graphql.request<
    FlowDefinitionHistoryQuery,
    FlowDefinitionHistoryQueryVariables
  >(FlowDefinitionHistoryQueryText, {
    flowId,
    companyId: companyId ?? null,
  }).pipe(
    Effect.map(data =>
      SucceededLoadFlowHistory({
        definitions: data.Flow.history.map(toWorkflowDefinition),
      }),
    ),
    Effect.catch((error: string) =>
      Effect.succeed(FailedLoadFlowHistory({ error })),
    ),
  ),
)

export const SaveFlowDraft = Command.define(
  'SaveFlowDraft',
  {
    flowId: S.String,
    workflow: Workflow.WorkflowDefinition,
    companyId: S.optional(S.String),
  },
  S.Union([SucceededSaveFlowDraft, FailedSaveFlowDraft]),
)(({ flowId, workflow, companyId }) =>
  Graphql.request<UpdateFlowDraftResponse, UpdateFlowDraftVariables>(
    UpdateFlowDraftMutationText,
    { flowId, input: toUpdateFlowDraftInput(workflow), companyId },
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
  {
    flowId: S.String,
    workflow: Workflow.WorkflowDefinition,
    companyId: S.optional(S.String),
  },
  S.Union([SucceededPublishFlow, FailedPublishFlow]),
)(({ flowId, workflow, companyId }) =>
  Graphql.request<UpdateFlowDraftResponse, UpdateFlowDraftVariables>(
    UpdateFlowDraftMutationText,
    { flowId, input: toUpdateFlowDraftInput(workflow), companyId },
  ).pipe(
    Effect.flatMap(data =>
      Graphql.request<PublishFlowResponse, PublishFlowVariables>(
        PublishFlowMutationText,
        { flowId: data.Flow.updateDraft.id, companyId },
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
