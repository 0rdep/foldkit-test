import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as WorkspaceMessage from './page/workspace/message'

export {
  ClickedAppliedDefaultFlow,
  ClickedAppliedMissingAutomations,
  ClickedAddedStatus,
  ClickedClosedGraphContextMenu,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedDuplicatedStatus,
  ClickedAddedDeliveryAutomation,
  ClickedClosedWorkflowJsonModal,
  ClickedCopiedWorkflowExportJson,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedMovedTransitionEarlier,
  ClickedMovedTransitionLater,
  ClickedOpenedWorkflowExportModal,
  ClickedOpenedWorkflowImportModal,
  ClickedPublishedRemoteFlow,
  ClickedRemovedDeliveryAutomation,
  ClickedSavedRemoteFlowDraft,
  ClickedSelectedWorkflow,
  ClickedToggledStatusActionDisclosure,
  ClickedToggledStatusActionRole,
  ClickedToggledTransitionRole,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  PressedGraphCanvasContextMenu,
  PressedGraphNodeContextMenu,
  PressedGraphTransitionContextMenu,
  PressedTransitionOutput,
  ReleasedGraphCanvasPointer,
  ReleasedTransitionInput,
  SelectedDeliveryAutomationStatus,
  SelectedNamedAutomationSourceStatus,
  SelectedNamedAutomationTargetStatus,
  SelectedNamedAutomationType,
  SelectedStatus,
  SelectedStatusType,
  SelectedTransitionAutomationType,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  SubmittedWorkflowImportJson,
  SuppressedNativeGraphContextMenu,
  UpdatedDeliveryAutomationEnabled,
  UpdatedFlowDocumentType,
  UpdatedNamedAutomationEnabled,
  UpdatedStatusId,
  UpdatedStatusName,
  UpdatedTargetCompanyId,
  UpdatedTransitionAutomationOnly,
  UpdatedWorkflowImportJson,
} from './page/workspace/message'

export const GotWorkspaceMessage = m('GotWorkspaceMessage', {
  message: WorkspaceMessage.Message,
})
export const ScrolledCanvas = m('ScrolledCanvas', {
  deltaY: S.Number,
  x: S.Number,
  y: S.Number,
})
export const MovedGraphClientPointer = m('MovedGraphClientPointer', {
  x: S.Number,
  y: S.Number,
})
export const ReleasedGraphClientPointer = m('ReleasedGraphClientPointer', {
  x: S.Number,
  y: S.Number,
})
export const ClickedHidLeftPanel = m('ClickedHidLeftPanel')
export const ClickedOpenedLeftPanel = m('ClickedOpenedLeftPanel')
export const GotFlowHistoryDisclosureMessage = m(
  'GotFlowHistoryDisclosureMessage',
  { message: Disclosure.Message },
)
export const GotAutomationsDisclosureMessage = m(
  'GotAutomationsDisclosureMessage',
  { message: Disclosure.Message },
)
export const GotDeliveryAutomationDisclosureMessage = m(
  'GotDeliveryAutomationDisclosureMessage',
  { message: Disclosure.Message },
)
export const GotIncomingTransitionsDisclosureMessage = m(
  'GotIncomingTransitionsDisclosureMessage',
  { message: Disclosure.Message },
)
export const GotOutgoingTransitionsDisclosureMessage = m(
  'GotOutgoingTransitionsDisclosureMessage',
  { message: Disclosure.Message },
)
export const GotNodeTransitionDisclosureMessage = m(
  'GotNodeTransitionDisclosureMessage',
  { transitionId: S.String, message: Disclosure.Message },
)
export const GotEditableActionsDisclosureMessage = m(
  'GotEditableActionsDisclosureMessage',
  { message: Disclosure.Message },
)

export const Message = S.Union([
  WorkspaceMessage.Message,
  GotWorkspaceMessage,
  ScrolledCanvas,
  MovedGraphClientPointer,
  ReleasedGraphClientPointer,
  ClickedHidLeftPanel,
  ClickedOpenedLeftPanel,
  GotFlowHistoryDisclosureMessage,
  GotAutomationsDisclosureMessage,
  GotDeliveryAutomationDisclosureMessage,
  GotIncomingTransitionsDisclosureMessage,
  GotOutgoingTransitionsDisclosureMessage,
  GotNodeTransitionDisclosureMessage,
  GotEditableActionsDisclosureMessage,
])
export type Message = typeof Message.Type
