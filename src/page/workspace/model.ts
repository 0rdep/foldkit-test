import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Workflow } from '../../domain'

export const SavedWorkspace = S.Struct({
  workflow: Workflow.WorkflowDefinition,
  actors: S.Array(Workflow.Actor),
  documents: S.Array(Workflow.DocumentInstance),
  nextSequence: S.Number,
})

export type SavedWorkspace = typeof SavedWorkspace.Type

export const SelectedItemKind = S.Literals(['Workflow', 'Status', 'Transition'])
export type SelectedItemKind = typeof SelectedItemKind.Type

export const GraphPanIdle = ts('GraphPanIdle')
export const GraphPanning = ts('GraphPanning', {
  startScreenX: S.Number,
  startScreenY: S.Number,
  startPanX: S.Number,
  startPanY: S.Number,
})
export const GraphPanState = S.Union([GraphPanIdle, GraphPanning])
export type GraphPanState = typeof GraphPanState.Type

export const Model = S.Struct({
  workflow: Workflow.WorkflowDefinition,
  actors: S.Array(Workflow.Actor),
  documents: S.Array(Workflow.DocumentInstance),
  nextSequence: S.Number,
  selectedStatusId: S.String,
  selectedTransitionId: S.String,
  selectedItemKind: SelectedItemKind,
  selectedItemId: S.String,
  graphPanX: S.Number,
  graphPanY: S.Number,
  graphZoom: S.Number,
  graphPanState: GraphPanState,
  selectedActorId: S.String,
  selectedDocumentId: S.String,
  lastRequestJson: S.String,
  lastResponseJson: S.String,
  banner: S.String,
})

export type Model = typeof Model.Type
