import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as WorkspaceMessage from './page/workspace/message'

export {
  ClickedAppliedDefaultFlow,
  ClickedAddedStatus,
  ClickedClosedGraphContextMenu,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedMovedTransitionEarlier,
  ClickedMovedTransitionLater,
  ClickedPublishedRemoteFlow,
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
  SelectedStatus,
  SelectedStatusType,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  SuppressedNativeGraphContextMenu,
  UpdatedFlowDocumentType,
  UpdatedStatusId,
  UpdatedStatusName,
  UpdatedTargetCompanyId,
  UpdatedTransitionAutomationOnly,
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
  GotIncomingTransitionsDisclosureMessage,
  GotOutgoingTransitionsDisclosureMessage,
  GotNodeTransitionDisclosureMessage,
  GotEditableActionsDisclosureMessage,
])
export type Message = typeof Message.Type
