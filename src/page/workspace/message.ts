import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Workflow } from '../../domain'

export const ClickedSelectedWorkflow = m('ClickedSelectedWorkflow')
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
export const ClickedAddedApprovalRule = m('ClickedAddedApprovalRule', {
  transitionId: S.String,
  roleId: S.String,
})
export const SelectedApprovalRuleRole = m('SelectedApprovalRuleRole', {
  transitionId: S.String,
  ruleId: S.String,
  roleId: S.String,
})
export const UpdatedApprovalRuleMinAmount = m('UpdatedApprovalRuleMinAmount', {
  transitionId: S.String,
  ruleId: S.String,
  value: S.String,
})
export const UpdatedApprovalRuleMaxAmount = m('UpdatedApprovalRuleMaxAmount', {
  transitionId: S.String,
  ruleId: S.String,
  value: S.String,
})
export const UpdatedApprovalRuleRequiredCount = m(
  'UpdatedApprovalRuleRequiredCount',
  {
    transitionId: S.String,
    ruleId: S.String,
    value: S.String,
  },
)
export const ClickedRemovedApprovalRule = m('ClickedRemovedApprovalRule', {
  transitionId: S.String,
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
export const CompletedSaveWorkspace = m('CompletedSaveWorkspace')

export const Message = S.Union([
  ClickedSelectedWorkflow,
  SelectedStatus,
  UpdatedStatusName,
  SelectedStatusType,
  ClickedToggledStatusLock,
  ClickedAddedStatus,
  ClickedDeletedStatus,
  SelectedTransition,
  UpdatedTransitionLabel,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  ClickedToggledTransitionApproval,
  ClickedAddedTransition,
  ClickedAddedApprovalRule,
  SelectedApprovalRuleRole,
  UpdatedApprovalRuleMinAmount,
  UpdatedApprovalRuleMaxAmount,
  UpdatedApprovalRuleRequiredCount,
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
  CompletedSaveWorkspace,
])
export type Message = typeof Message.Type
