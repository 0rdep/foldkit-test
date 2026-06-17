import { Workflow } from '../domain'
import type {
  FlowEditableActionDefinitionInput,
  FlowStatusDefinitionInput,
  FlowStatusKind,
  FlowTransitionDefinitionInput,
  UpdateFlowDraftInput,
} from './generated'
import type { FlowDefinitionFieldsFragment } from './operations-generated'

const statusTypeFromKind = (kind: FlowStatusKind): Workflow.StatusType => {
  if (kind === 'draft') {
    return 'draft'
  }
  if (kind === 'final') {
    return 'final'
  }
  return 'normal'
}

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
  state: definition.state,
  initialStatusId: definition.initialStatusId,
  statuses: definition.statuses.map(status => ({
    id: status.id,
    name: status.name,
    type: statusTypeFromKind(status.kind),
    editPolicy: editPolicyFromActions(status.editableActions),
  })),
  transitions: definition.transitions.map(transition => ({
    id: transition.id,
    fromStatusId: transition.fromStatusId,
    toStatusId: transition.toStatusId,
    allowedRoles: [...transition.allowedRoles],
    automationOnly: transition.automationOnly ?? false,
    effects: [],
  })),
  deliveryAutomation: definition.deliveryAutomation ?? undefined,
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
    }),
  ),
  transitions: workflow.transitions.map(
    (transition): FlowTransitionDefinitionInput => ({
      id: transition.id,
      fromStatusId: transition.fromStatusId,
      toStatusId: transition.toStatusId,
      allowedRoles: transition.allowedRoles,
      automationOnly: transition.automationOnly ?? false,
    }),
  ),
  deliveryAutomation: workflow.deliveryAutomation ?? null,
})
