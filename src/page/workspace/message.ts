import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { Workflow } from '../../domain'
import { FlowDocumentType } from './model'

const DeliveryAutomationStatusField = S.Literals([
  'fullyDeliveredStatusId',
  'partiallyDeliveredStatusId',
  'partiallyDeliveredCompletionRequiredStatusId',
])

export const ClickedSelectedWorkflow = m('ClickedSelectedWorkflow')
export const ClickedToggledActionMenu = m('ClickedToggledActionMenu')
export const UpdatedTargetCompanyId = m('UpdatedTargetCompanyId', {
  value: S.String,
})
export const UpdatedFlowDocumentType = m('UpdatedFlowDocumentType', {
  value: FlowDocumentType,
})
export const ClickedSavedPreviewLocal = m('ClickedSavedPreviewLocal')
export const ClickedUndidFlowChanges = m('ClickedUndidFlowChanges')
export const SelectedStatus = m('SelectedStatus', { statusId: S.String })
export const UpdatedStatusName = m('UpdatedStatusName', {
  statusId: S.String,
  value: S.String,
})
export const UpdatedStatusId = m('UpdatedStatusId', {
  statusId: S.String,
  value: S.String,
})
export const SelectedStatusType = m('SelectedStatusType', {
  statusId: S.String,
  value: Workflow.StatusType,
})
export const ClickedToggledStatusActionRole = m(
  'ClickedToggledStatusActionRole',
  {
    statusId: S.String,
    action: Workflow.EditableAction,
    roleId: S.String,
  },
)
export const ClickedToggledStatusActionDisclosure = m(
  'ClickedToggledStatusActionDisclosure',
  {
    statusId: S.String,
    action: Workflow.EditableAction,
  },
)
export const ClickedAddedStatus = m('ClickedAddedStatus')
export const ClickedDeletedStatus = m('ClickedDeletedStatus', {
  statusId: S.String,
})
export const SelectedTransition = m('SelectedTransition', {
  transitionId: S.String,
})
export const ClickedToggledTransitionRole = m('ClickedToggledTransitionRole', {
  transitionId: S.String,
  roleId: S.String,
})
export const UpdatedTransitionAutomationOnly = m(
  'UpdatedTransitionAutomationOnly',
  {
    transitionId: S.String,
    value: S.Boolean,
  },
)
export const SelectedTransitionAutomationType = m(
  'SelectedTransitionAutomationType',
  {
    transitionId: S.String,
    automationType: Workflow.AutomationType,
  },
)
export const ClickedMovedTransitionEarlier = m(
  'ClickedMovedTransitionEarlier',
  { transitionId: S.String },
)
export const ClickedMovedTransitionLater = m('ClickedMovedTransitionLater', {
  transitionId: S.String,
})
export const SelectedTransitionFromStatus = m('SelectedTransitionFromStatus', {
  transitionId: S.String,
  statusId: S.String,
})
export const SelectedTransitionToStatus = m('SelectedTransitionToStatus', {
  transitionId: S.String,
  statusId: S.String,
})
export const ClickedAddedTransition = m('ClickedAddedTransition')
export const ClickedDeletedTransition = m('ClickedDeletedTransition', {
  transitionId: S.String,
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
export const ClickedAddedDeliveryAutomation = m(
  'ClickedAddedDeliveryAutomation',
)
export const ClickedRemovedDeliveryAutomation = m(
  'ClickedRemovedDeliveryAutomation',
)
export const UpdatedDeliveryAutomationEnabled = m(
  'UpdatedDeliveryAutomationEnabled',
  { value: S.Boolean },
)
export const SelectedDeliveryAutomationStatus = m(
  'SelectedDeliveryAutomationStatus',
  {
    field: DeliveryAutomationStatusField,
    statusId: S.String,
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
export const PressedTransitionOutput = m('PressedTransitionOutput', {
  statusId: S.String,
  screenX: S.Number,
  screenY: S.Number,
})
export const ReleasedTransitionInput = m('ReleasedTransitionInput', {
  statusId: S.String,
})
export const PressedGraphCanvasContextMenu = m(
  'PressedGraphCanvasContextMenu',
  {
    clientX: S.Number,
    clientY: S.Number,
  },
)
export const PressedGraphNodeContextMenu = m('PressedGraphNodeContextMenu', {
  statusId: S.String,
  clientX: S.Number,
  clientY: S.Number,
})
export const PressedGraphTransitionContextMenu = m(
  'PressedGraphTransitionContextMenu',
  {
    transitionId: S.String,
    clientX: S.Number,
    clientY: S.Number,
  },
)
export const SuppressedNativeGraphContextMenu = m(
  'SuppressedNativeGraphContextMenu',
)
export const ClickedClosedGraphContextMenu = m('ClickedClosedGraphContextMenu')
export const ClickedZoomedGraphIn = m('ClickedZoomedGraphIn')
export const ClickedZoomedGraphOut = m('ClickedZoomedGraphOut')
export const ClickedResetGraphViewport = m('ClickedResetGraphViewport')
export const ClickedResetWorkspace = m('ClickedResetWorkspace')
export const ClickedOpenedWorkflowExportModal = m(
  'ClickedOpenedWorkflowExportModal',
)
export const ClickedOpenedWorkflowImportModal = m(
  'ClickedOpenedWorkflowImportModal',
)
export const ClickedClosedWorkflowJsonModal = m(
  'ClickedClosedWorkflowJsonModal',
)
export const ClickedCopiedWorkflowExportJson = m(
  'ClickedCopiedWorkflowExportJson',
)
export const UpdatedWorkflowImportJson = m('UpdatedWorkflowImportJson', {
  value: S.String,
})
export const SubmittedWorkflowImportJson = m('SubmittedWorkflowImportJson')
export const ClickedAppliedDefaultFlow = m('ClickedAppliedDefaultFlow')
export const ClickedLoadedRemoteFlowDefinitions = m(
  'ClickedLoadedRemoteFlowDefinitions',
)
export const ClickedRevertedFlowVersion = m('ClickedRevertedFlowVersion', {
  flowId: S.String,
  version: S.Number,
})
export const ClickedSavedRemoteFlowDraft = m('ClickedSavedRemoteFlowDraft')
export const ClickedPublishedRemoteFlow = m('ClickedPublishedRemoteFlow')
export const CompletedSaveWorkspace = m('CompletedSaveWorkspace')
export const SucceededCopyWorkflowExportJson = m(
  'SucceededCopyWorkflowExportJson',
)
export const FailedCopyWorkflowExportJson = m('FailedCopyWorkflowExportJson')
export const SucceededLoadFlowDefinitions = m('SucceededLoadFlowDefinitions', {
  definitions: S.Array(Workflow.WorkflowDefinition),
})
export const FailedLoadFlowDefinitions = m('FailedLoadFlowDefinitions', {
  error: S.String,
})
export const SucceededLoadCompanies = m('SucceededLoadCompanies', {
  companies: S.Array(
    S.Struct({ id: S.Number, name: S.String, active: S.Boolean }),
  ),
})
export const FailedLoadCompanies = m('FailedLoadCompanies', {
  error: S.String,
})
export const SucceededLoadFlowHistory = m('SucceededLoadFlowHistory', {
  definitions: S.Array(Workflow.WorkflowDefinition),
})
export const FailedLoadFlowHistory = m('FailedLoadFlowHistory', {
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
  UpdatedTargetCompanyId,
  UpdatedFlowDocumentType,
  ClickedSavedPreviewLocal,
  ClickedUndidFlowChanges,
  SelectedStatus,
  UpdatedStatusName,
  UpdatedStatusId,
  SelectedStatusType,
  ClickedToggledStatusActionRole,
  ClickedToggledStatusActionDisclosure,
  ClickedAddedStatus,
  ClickedDeletedStatus,
  SelectedTransition,
  ClickedToggledTransitionRole,
  UpdatedTransitionAutomationOnly,
  SelectedTransitionAutomationType,
  ClickedMovedTransitionEarlier,
  ClickedMovedTransitionLater,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  ClickedAddedTransition,
  ClickedDeletedTransition,
  ClickedAddedTransitionEffect,
  ClickedRemovedTransitionEffect,
  ClickedAddedDeliveryAutomation,
  ClickedRemovedDeliveryAutomation,
  UpdatedDeliveryAutomationEnabled,
  SelectedDeliveryAutomationStatus,
  SelectedActor,
  SelectedDocument,
  UpdatedDocumentAmount,
  SelectedDocumentStatus,
  ClickedRequestedTransition,
  PressedGraphCanvas,
  MovedGraphCanvasPointer,
  ReleasedGraphCanvasPointer,
  PressedTransitionOutput,
  ReleasedTransitionInput,
  PressedGraphCanvasContextMenu,
  PressedGraphNodeContextMenu,
  PressedGraphTransitionContextMenu,
  SuppressedNativeGraphContextMenu,
  ClickedClosedGraphContextMenu,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedOpenedWorkflowExportModal,
  ClickedOpenedWorkflowImportModal,
  ClickedClosedWorkflowJsonModal,
  ClickedCopiedWorkflowExportJson,
  UpdatedWorkflowImportJson,
  SubmittedWorkflowImportJson,
  ClickedAppliedDefaultFlow,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedRevertedFlowVersion,
  ClickedSavedRemoteFlowDraft,
  ClickedPublishedRemoteFlow,
  CompletedSaveWorkspace,
  SucceededCopyWorkflowExportJson,
  FailedCopyWorkflowExportJson,
  SucceededLoadFlowDefinitions,
  FailedLoadFlowDefinitions,
  SucceededLoadCompanies,
  FailedLoadCompanies,
  SucceededLoadFlowHistory,
  FailedLoadFlowHistory,
  SucceededSaveFlowDraft,
  FailedSaveFlowDraft,
  SucceededPublishFlow,
  FailedPublishFlow,
])
export type Message = typeof Message.Type
