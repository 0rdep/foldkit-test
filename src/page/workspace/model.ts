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
  didMove: S.Boolean,
})
export const GraphPanState = S.Union([GraphPanIdle, GraphPanning])
export type GraphPanState = typeof GraphPanState.Type

export const TransitionDragIdle = ts('TransitionDragIdle')
export const TransitionDragging = ts('TransitionDragging', {
  fromStatusId: S.String,
  startScreenX: S.Number,
  startScreenY: S.Number,
  currentScreenX: S.Number,
  currentScreenY: S.Number,
})
export const TransitionDragState = S.Union([
  TransitionDragIdle,
  TransitionDragging,
])
export type TransitionDragState = typeof TransitionDragState.Type

export const GraphContextMenuClosed = ts('GraphContextMenuClosed')
export const GraphCanvasContextMenu = ts('GraphCanvasContextMenu', {
  clientX: S.Number,
  clientY: S.Number,
})
export const GraphNodeContextMenu = ts('GraphNodeContextMenu', {
  statusId: S.String,
  clientX: S.Number,
  clientY: S.Number,
})
export const GraphTransitionContextMenu = ts('GraphTransitionContextMenu', {
  transitionId: S.String,
  clientX: S.Number,
  clientY: S.Number,
})
export const GraphContextMenuState = S.Union([
  GraphContextMenuClosed,
  GraphCanvasContextMenu,
  GraphNodeContextMenu,
  GraphTransitionContextMenu,
])
export type GraphContextMenuState = typeof GraphContextMenuState.Type

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
  transitionDragState: TransitionDragState,
  graphContextMenuState: GraphContextMenuState,
  isActionMenuOpen: S.Boolean,
  isPreviewSaved: S.Boolean,
  isDirty: S.Boolean,
  undoStack: S.Array(Workflow.WorkflowDefinition),
  selectedActorId: S.String,
  selectedDocumentId: S.String,
  lastRequestJson: S.String,
  lastResponseJson: S.String,
  banner: S.String,
})

export type Model = typeof Model.Type
