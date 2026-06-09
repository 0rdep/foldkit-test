import { Workflow } from './domain'

export const STORAGE_KEY = 'flow-web-workspace'

export const DEFAULT_ACTORS: ReadonlyArray<Workflow.Actor> = [
  { id: 'pedro', name: 'Pedro Requester', roleIds: ['requester'] },
  { id: 'maria', name: 'Maria Manager', roleIds: ['manager'] },
  { id: 'ana', name: 'Ana Finance', roleIds: ['finance'] },
  { id: 'carlos', name: 'Carlos Director', roleIds: ['director'] },
]

export const DEFAULT_WORKFLOW: Workflow.WorkflowDefinition = {
  id: 'requisition-flow',
  name: 'Requisition approval flow',
  documentType: 'Requisition',
  version: 1,
  initialStatusId: 'draft',
  statuses: [
    {
      id: 'draft',
      name: 'Draft',
      type: 'draft',
      isTerminal: false,
      editPolicy: Workflow.unlockedEditPolicy,
    },
    {
      id: 'waiting-manager-approval',
      name: 'Waiting Manager Approval',
      type: 'approvalPending',
      isTerminal: false,
      editPolicy: Workflow.approvalEditPolicy,
    },
    {
      id: 'finance-review',
      name: 'Finance Review',
      type: 'approvalPending',
      isTerminal: false,
      editPolicy: Workflow.approvalEditPolicy,
    },
    {
      id: 'director-approval',
      name: 'Director Approval',
      type: 'approvalPending',
      isTerminal: false,
      editPolicy: Workflow.approvalEditPolicy,
    },
    {
      id: 'approved',
      name: 'Approved',
      type: 'normal',
      isTerminal: false,
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'syncing',
      name: 'Syncing ERP',
      type: 'integration',
      isTerminal: false,
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'sync-failed',
      name: 'Sync Failed',
      type: 'error',
      isTerminal: false,
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'synced',
      name: 'Synced',
      type: 'terminal',
      isTerminal: true,
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'rejected',
      name: 'Rejected',
      type: 'terminal',
      isTerminal: true,
      editPolicy: Workflow.lockedEditPolicy,
    },
  ],
  transitions: [
    {
      id: 'submit-to-manager',
      fromStatusId: 'draft',
      toStatusId: 'waiting-manager-approval',
      label: 'Submit for approval',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [
        {
          id: 'notify-manager',
          type: 'SendNotification',
          label: 'Notify manager approvers',
        },
      ],
    },
    {
      id: 'manager-approves',
      fromStatusId: 'waiting-manager-approval',
      toStatusId: 'finance-review',
      label: 'Manager approves',
      requiresApproval: true,
      approvalMode: 'all',
      approvalRules: [
        {
          id: 'manager-any-amount',
          roleId: 'manager',
          minAmount: 0,
          maxAmount: 0,
          requiredCount: 1,
        },
      ],
      effects: [
        {
          id: 'audit-manager-approval',
          type: 'CreateAuditLog',
          label: 'Audit manager approval',
        },
      ],
    },
    {
      id: 'finance-approves-standard',
      fromStatusId: 'finance-review',
      toStatusId: 'approved',
      label: 'Finance approves standard amount',
      requiresApproval: true,
      approvalMode: 'all',
      approvalRules: [
        {
          id: 'finance-standard-amount',
          roleId: 'finance',
          minAmount: 0,
          maxAmount: 9999,
          requiredCount: 1,
        },
      ],
      effects: [
        {
          id: 'audit-finance-standard',
          type: 'CreateAuditLog',
          label: 'Audit finance approval',
        },
      ],
    },
    {
      id: 'finance-approves-high',
      fromStatusId: 'finance-review',
      toStatusId: 'director-approval',
      label: 'Finance sends high amount to director',
      requiresApproval: true,
      approvalMode: 'all',
      approvalRules: [
        {
          id: 'finance-high-amount',
          roleId: 'finance',
          minAmount: 10000,
          maxAmount: 0,
          requiredCount: 1,
        },
      ],
      effects: [
        {
          id: 'notify-director',
          type: 'SendNotification',
          label: 'Notify director approvers',
        },
      ],
    },
    {
      id: 'director-approves',
      fromStatusId: 'director-approval',
      toStatusId: 'approved',
      label: 'Director approves',
      requiresApproval: true,
      approvalMode: 'all',
      approvalRules: [
        {
          id: 'director-high-amount',
          roleId: 'director',
          minAmount: 10000,
          maxAmount: 0,
          requiredCount: 1,
        },
      ],
      effects: [
        {
          id: 'audit-director-approval',
          type: 'CreateAuditLog',
          label: 'Audit director approval',
        },
      ],
    },
    {
      id: 'reject-from-manager',
      fromStatusId: 'waiting-manager-approval',
      toStatusId: 'rejected',
      label: 'Reject requisition',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [
        {
          id: 'notify-rejection',
          type: 'SendNotification',
          label: 'Notify requester about rejection',
        },
      ],
    },
    {
      id: 'start-sync',
      fromStatusId: 'approved',
      toStatusId: 'syncing',
      label: 'Start ERP sync',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [
        {
          id: 'sync-to-erp',
          type: 'SyncExternalSystem',
          label: 'Sync requisition to ERP',
        },
      ],
    },
    {
      id: 'mark-synced',
      fromStatusId: 'syncing',
      toStatusId: 'synced',
      label: 'Mark sync succeeded',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [
        {
          id: 'audit-sync-success',
          type: 'CreateAuditLog',
          label: 'Audit successful ERP sync',
        },
      ],
    },
    {
      id: 'mark-sync-failed',
      fromStatusId: 'syncing',
      toStatusId: 'sync-failed',
      label: 'Mark sync failed',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [
        {
          id: 'notify-sync-failure',
          type: 'SendNotification',
          label: 'Notify operations about failed sync',
        },
      ],
    },
  ],
}

export const DEFAULT_DOCUMENTS: ReadonlyArray<Workflow.DocumentInstance> = [
  {
    id: 'req-1001',
    code: 'REQ-1001',
    workflowId: DEFAULT_WORKFLOW.id,
    workflowVersion: DEFAULT_WORKFLOW.version,
    amount: 12000,
    currentStatusId: DEFAULT_WORKFLOW.initialStatusId,
    approvals: [],
    effectLog: [],
    eventLog: [{ id: 'event-1', label: 'REQ-1001 created as Draft' }],
  },
]

export const DEFAULT_NEXT_SEQUENCE = 100
