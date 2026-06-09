import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as WorkspaceMessage from './page/workspace/message'

export {
  ClickedAddedApprovalRule,
  ClickedAddedStatus,
  ClickedAddedTransition,
  ClickedAddedTransitionEffect,
  ClickedDeletedStatus,
  ClickedRemovedApprovalRule,
  ClickedRemovedTransitionEffect,
  ClickedRequestedTransition,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedSelectedWorkflow,
  ClickedToggledStatusLock,
  ClickedToggledTransitionApproval,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
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
  UpdatedApprovalRuleMaxAmount,
  UpdatedApprovalRuleMinAmount,
  UpdatedApprovalRuleRequiredCount,
  UpdatedDocumentAmount,
  UpdatedStatusName,
  UpdatedTransitionLabel,
} from './page/workspace/message'

export const GotWorkspaceMessage = m('GotWorkspaceMessage', {
  message: WorkspaceMessage.Message,
})

export const Message = S.Union([WorkspaceMessage.Message, GotWorkspaceMessage])
export type Message = typeof Message.Type
