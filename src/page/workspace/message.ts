import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Workflow } from '../../domain'

export const ClickedSelectedWorkflow = m('ClickedSelectedWorkflow')
export const ClickedToggledActionMenu = m('ClickedToggledActionMenu')
export const ClickedSavedPreviewLocal = m('ClickedSavedPreviewLocal')
export const ClickedUndidFlowChanges = m('ClickedUndidFlowChanges')
export const SelectedStatus = m('SelectedStatus', { statusId: S.String })
export const UpdatedStatusName = m('UpdatedStatusName', {
  statusId: S.String,
  value: S.String,
})
export const SelectedStatusType = m('SelectedStatusType', {
  statusId: S.String,
  value: Workflow.StatusType,
})
export const ClickedToggledStatusLock = m('ClickedToggledStatusLock', {
  statusId: S.String,
  field: Workflow.LockField,
})
export const ClickedAddedStatus = m('ClickedAddedStatus')
export const ClickedDeletedStatus = m('ClickedDeletedStatus', {
  statusId: S.String,
})
export const SelectedTransition = m('SelectedTransition', {
  transitionId: S.String,
})
export const UpdatedTransitionLabel = m('UpdatedTransitionLabel', {
  transitionId: S.String,
  value: S.String,
})
export const UpdatedTransitionSortOrder = m('UpdatedTransitionSortOrder', {
  transitionId: S.String,
  value: S.String,
})
export const ClickedToggledTransitionRole = m('ClickedToggledTransitionRole', {
  transitionId: S.String,
  roleId: S.String,
})
export const SelectedTransitionFromStatus = m('SelectedTransitionFromStatus', {
  transitionId: S.String,
  statusId: S.String,
})
export const SelectedTransitionToStatus = m('SelectedTransitionToStatus', {
  transitionId: S.String,
  statusId: S.String,
})
export const ClickedToggledTransitionApproval = m(
  'ClickedToggledTransitionApproval',
  { transitionId: S.String },
)
export const ClickedAddedTransition = m('ClickedAddedTransition')
export const ClickedDeletedTransition = m('ClickedDeletedTransition', {
  transitionId: S.String,
})
export const ClickedAddedApprovalRule = m('ClickedAddedApprovalRule', {
  statusId: S.String,
})
export const SelectedApprovalRuleRole = m('SelectedApprovalRuleRole', {
  statusId: S.String,
  ruleId: S.String,
  roleId: S.String,
})
export const UpdatedApprovalRuleMinAmount = m('UpdatedApprovalRuleMinAmount', {
  statusId: S.String,
  ruleId: S.String,
  value: S.String,
})
export const ClickedRemovedApprovalRule = m('ClickedRemovedApprovalRule', {
  statusId: S.String,
  ruleId: S.String,
})
export const ClickedAddedTransitionEffect = m('ClickedAddedTransitionEffect', {
  transitionId: S.String,
  effectType: Workflow.EffectType,
})
export const ClickedRemovedTransitionEffect = m(
  'ClickedRemovedTransitionEffect',
  {
    transitionId: S.String,
    effectId: S.String,
  },
)
export const SelectedActor = m('SelectedActor', { actorId: S.String })
export const SelectedDocument = m('SelectedDocument', { documentId: S.String })
export const UpdatedDocumentAmount = m('UpdatedDocumentAmount', {
  documentId: S.String,
  value: S.String,
})
export const SelectedDocumentStatus = m('SelectedDocumentStatus', {
  documentId: S.String,
  statusId: S.String,
})
export const ClickedRequestedTransition = m('ClickedRequestedTransition', {
  transitionId: S.String,
})
export const PressedGraphCanvas = m('PressedGraphCanvas', {
  screenX: S.Number,
  screenY: S.Number,
})
export const MovedGraphCanvasPointer = m('MovedGraphCanvasPointer', {
  screenX: S.Number,
  screenY: S.Number,
})
export const ReleasedGraphCanvasPointer = m('ReleasedGraphCanvasPointer')
export const ClickedZoomedGraphIn = m('ClickedZoomedGraphIn')
export const ClickedZoomedGraphOut = m('ClickedZoomedGraphOut')
export const ClickedResetGraphViewport = m('ClickedResetGraphViewport')
export const ClickedResetWorkspace = m('ClickedResetWorkspace')
export const ClickedLoadedRemoteFlowDefinitions = m(
  'ClickedLoadedRemoteFlowDefinitions',
)
export const ClickedSavedRemoteFlowDraft = m('ClickedSavedRemoteFlowDraft')
export const ClickedPublishedRemoteFlow = m('ClickedPublishedRemoteFlow')
export const CompletedSaveWorkspace = m('CompletedSaveWorkspace')
export const SucceededLoadFlowDefinitions = m('SucceededLoadFlowDefinitions', {
  definitions: S.Array(Workflow.WorkflowDefinition),
})
export const FailedLoadFlowDefinitions = m('FailedLoadFlowDefinitions', {
  error: S.String,
})
export const SucceededSaveFlowDraft = m('SucceededSaveFlowDraft', {
  workflow: Workflow.WorkflowDefinition,
})
export const FailedSaveFlowDraft = m('FailedSaveFlowDraft', {
  error: S.String,
})
export const SucceededPublishFlow = m('SucceededPublishFlow', {
  workflow: Workflow.WorkflowDefinition,
})
export const FailedPublishFlow = m('FailedPublishFlow', {
  error: S.String,
})

export const Message = S.Union([
  ClickedSelectedWorkflow,
  ClickedToggledActionMenu,
  ClickedSavedPreviewLocal,
  ClickedUndidFlowChanges,
  SelectedStatus,
  UpdatedStatusName,
  SelectedStatusType,
  ClickedToggledStatusLock,
  ClickedAddedStatus,
  ClickedDeletedStatus,
  SelectedTransition,
  UpdatedTransitionLabel,
  UpdatedTransitionSortOrder,
  ClickedToggledTransitionRole,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  ClickedToggledTransitionApproval,
  ClickedAddedTransition,
  ClickedDeletedTransition,
  ClickedAddedApprovalRule,
  SelectedApprovalRuleRole,
  UpdatedApprovalRuleMinAmount,
  ClickedRemovedApprovalRule,
  ClickedAddedTransitionEffect,
  ClickedRemovedTransitionEffect,
  SelectedActor,
  SelectedDocument,
  UpdatedDocumentAmount,
  SelectedDocumentStatus,
  ClickedRequestedTransition,
  PressedGraphCanvas,
  MovedGraphCanvasPointer,
  ReleasedGraphCanvasPointer,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedSavedRemoteFlowDraft,
  ClickedPublishedRemoteFlow,
  CompletedSaveWorkspace,
  SucceededLoadFlowDefinitions,
  FailedLoadFlowDefinitions,
  SucceededSaveFlowDraft,
  FailedSaveFlowDraft,
  SucceededPublishFlow,
  FailedPublishFlow,
])
export type Message = typeof Message.Type
