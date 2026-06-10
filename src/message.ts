import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as WorkspaceMessage from './page/workspace/message'

export {
  ClickedAddedApprovalRule,
  ClickedAddedStatus,
  ClickedAddedTransition,
  ClickedAddedTransitionEffect,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedRemovedApprovalRule,
  ClickedRemovedTransitionEffect,
  ClickedRequestedTransition,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedPublishedRemoteFlow,
  ClickedSavedRemoteFlowDraft,
  ClickedSavedPreviewLocal,
  ClickedSelectedWorkflow,
  ClickedToggledStatusLock,
  ClickedToggledActionMenu,
  ClickedToggledTransitionApproval,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  ClickedUndidFlowChanges,
  CompletedSaveWorkspace,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  ReleasedGraphCanvasPointer,
  SelectedActor,
  SelectedApprovalRuleRole,
  SelectedDocument,
  SelectedDocumentStatus,
  SelectedStatus,
  SelectedStatusType,
  SelectedTransition,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  UpdatedApprovalRuleMinAmount,
  UpdatedDocumentAmount,
  UpdatedStatusName,
  UpdatedTransitionLabel,
  FailedPublishFlow,
  SucceededPublishFlow,
} from './page/workspace/message'

export const GotWorkspaceMessage = m('GotWorkspaceMessage', {
  message: WorkspaceMessage.Message,
})

export const Message = S.Union([WorkspaceMessage.Message, GotWorkspaceMessage])
export type Message = typeof Message.Type
