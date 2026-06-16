import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as WorkspaceMessage from './page/workspace/message'

export {
  ClickedAppliedDefaultFlow,
  ClickedAddedStatus,
  ClickedAddedTransition,
  ClickedAddedTransitionEffect,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedClosedGraphContextMenu,
  ClickedRemovedTransitionEffect,
  ClickedRequestedTransition,
  ClickedRevertedFlowVersion,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedPublishedRemoteFlow,
  ClickedSavedRemoteFlowDraft,
  ClickedSavedPreviewLocal,
  ClickedSelectedWorkflow,
  ClickedToggledStatusActionRole,
  ClickedToggledStatusActionDisclosure,
  ClickedToggledActionMenu,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  ClickedUndidFlowChanges,
  CompletedSaveWorkspace,
  FailedLoadCompanies,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  PressedGraphCanvasContextMenu,
  PressedGraphNodeContextMenu,
  PressedGraphTransitionContextMenu,
  PressedTransitionOutput,
  ReleasedGraphCanvasPointer,
  ReleasedTransitionInput,
  SelectedActor,
  SelectedDocument,
  SelectedDocumentStatus,
  SelectedStatus,
  SelectedStatusType,
  SelectedTransition,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  SuppressedNativeGraphContextMenu,
  UpdatedDocumentAmount,
  UpdatedStatusName,
  UpdatedTargetCompanyId,
  UpdatedTransitionLabel,
  FailedPublishFlow,
  SucceededLoadCompanies,
  SucceededLoadFlowHistory,
  SucceededPublishFlow,
} from './page/workspace/message'

export const GotWorkspaceMessage = m('GotWorkspaceMessage', {
  message: WorkspaceMessage.Message,
})

export const Message = S.Union([WorkspaceMessage.Message, GotWorkspaceMessage])
export type Message = typeof Message.Type
