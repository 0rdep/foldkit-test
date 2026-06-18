import { DEFAULT_REQUISITION_FLOW } from './default-flow-definitions'
import { Workflow } from './domain'

export const STORAGE_KEY = 'flow-web-workspace'

export const DEFAULT_ACTORS: ReadonlyArray<Workflow.Actor> = [
  { id: 'pedro', name: 'Pedro Requester', roleIds: ['OrderCreator'] },
  { id: 'maria', name: 'Maria Manager', roleIds: ['OrderModerator'] },
  { id: 'ana', name: 'Ana Finance', roleIds: ['OrderModeratorLimited'] },
  { id: 'carlos', name: 'Carlos Director', roleIds: ['SystemAdmin'] },
]

export const DEFAULT_WORKFLOW: Workflow.WorkflowDefinition =
  DEFAULT_REQUISITION_FLOW

export const DEFAULT_DOCUMENTS: ReadonlyArray<Workflow.DocumentInstance> = [
  {
    id: 'req-1001',
    code: 'REQ-1001',
    workflowId: DEFAULT_WORKFLOW.id,
    workflowVersion: DEFAULT_WORKFLOW.version,
    amount: 12000,
    currentStatusId: DEFAULT_WORKFLOW.initialStatusId,
    effectLog: [],
    eventLog: [{ id: 'event-1', label: 'REQ-1001 created as Draft' }],
  },
]

export const DEFAULT_NEXT_SEQUENCE = 100
