import { Array, Option } from 'effect'

import { Workflow } from '../domain'
import type {
  FlowEditableActionDefinitionInput,
  FlowStatusDefinitionInput,
  FlowTransitionDefinitionInput,
  UpdateFlowDraftInput,
} from './generated'
import type { FlowDefinitionFieldsFragment } from './operations-generated'

type FlowApproval = NonNullable<
  FlowDefinitionFieldsFragment['statuses'][number]['approval']
>

const roleIdFromApprovers = (
  approvers: FlowApproval['rules'][number]['approvers'],
): string =>
  Option.getOrElse(
    Array.findFirst(approvers, approver => approver.type === 'role'),
    () => ({ roleId: 'OrderModerator' }),
  ).roleId ?? 'OrderModerator'

const editableActionsFromPolicy = (
  editPolicy: Workflow.EditPolicy,
): Array<FlowEditableActionDefinitionInput> =>
  editPolicy.map(definition => ({
    action: definition.action,
    allowedRoles: [...definition.allowedRoles],
  }))

const editPolicyFromActions = (
  editableActions: FlowDefinitionFieldsFragment['statuses'][number]['editableActions'],
): Workflow.EditPolicy =>
  editableActions.map(definition =>
    Workflow.editableAction(definition.action, definition.allowedRoles),
  )

export const toWorkflowDefinition = (
  definition: FlowDefinitionFieldsFragment,
): Workflow.WorkflowDefinition => ({
  id: definition.id,
  name: definition.name,
  documentType: definition.documentType,
  version: definition.version,
  initialStatusId: definition.initialStatusId,
  statuses: definition.statuses.map(status => ({
    id: status.id,
    name: status.name,
    type: status.kind,
    editPolicy: editPolicyFromActions(status.editableActions),
    approval:
      status.approval === null
        ? undefined
        : {
            allowSelfApproval: status.approval.allowSelfApproval,
            approvedTransitionId: status.approval.approvedTransitionId,
            rejectedTransitionId: status.approval.rejectedTransitionId,
            rules: status.approval.rules.map(rule => ({
              id: rule.id,
              minAmount: rule.minAmount ?? 0,
              roleId: roleIdFromApprovers(rule.approvers),
            })),
          },
  })),
  transitions: definition.transitions.map(transition => ({
    id: transition.id,
    fromStatusId: transition.fromStatusId,
    toStatusId: transition.toStatusId,
    label: transition.label,
    allowedRoles: [...transition.allowedRoles],
    requiresComment: transition.requiresComment ?? false,
    sortOrder: transition.sortOrder,
    effects: [],
  })),
})

export const toUpdateFlowDraftInput = (
  workflow: Workflow.WorkflowDefinition,
): UpdateFlowDraftInput => ({
  name: workflow.name,
  initialStatusId: workflow.initialStatusId,
  statuses: workflow.statuses.map(
    (status): FlowStatusDefinitionInput => ({
      id: status.id,
      name: status.name,
      kind: status.type,
      editableActions: editableActionsFromPolicy(status.editPolicy),
      approval:
        status.approval === undefined
          ? null
          : {
              allowSelfApproval: status.approval.allowSelfApproval,
              approvedTransitionId: status.approval.approvedTransitionId,
              rejectedTransitionId: status.approval.rejectedTransitionId,
              rules: status.approval.rules.map(rule => ({
                id: rule.id,
                minAmount: rule.minAmount,
                approvers: [
                  {
                    type: 'role',
                    roleId: rule.roleId,
                    userId: null,
                  },
                ],
              })),
            },
    }),
  ),
  transitions: workflow.transitions.map(
    (transition, index): FlowTransitionDefinitionInput => ({
      id: transition.id,
      label: transition.label,
      fromStatusId: transition.fromStatusId,
      toStatusId: transition.toStatusId,
      allowedRoles: transition.allowedRoles,
      requiresComment: transition.requiresComment,
      sortOrder: transition.sortOrder,
    }),
  ),
})
