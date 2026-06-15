import { Workflow } from './domain'

export const STORAGE_KEY = 'flow-web-workspace'

export const DEFAULT_ACTORS: ReadonlyArray<Workflow.Actor> = [
  { id: 'pedro', name: 'Pedro Requester', roleIds: ['OrderCreator'] },
  { id: 'maria', name: 'Maria Manager', roleIds: ['OrderModerator'] },
  { id: 'ana', name: 'Ana Finance', roleIds: ['OrderModeratorLimited'] },
  { id: 'carlos', name: 'Carlos Director', roleIds: ['SystemAdmin'] },
]

export const DEFAULT_WORKFLOW: Workflow.WorkflowDefinition = {
  id: 'requisition-flow',
  name: 'Requisition approval flow',
  documentType: 'Requisition',
  version: 1,
  initialStatusId: 'DRAFT',
  statuses: [
    {
      id: 'DRAFT',
      name: 'Draft',
      type: 'draft',
      editPolicy: Workflow.unlockedEditPolicy,
    },
    {
      id: 'PENDING_APPROVAL',
      name: 'Pending Approval',
      type: 'approval',
      editPolicy: Workflow.approvalEditPolicy,
      approval: {
        allowSelfApproval: true,
        approvedTransitionId: 'pending-approval-to-approved',
        rejectedTransitionId: 'pending-approval-to-rejected',
        rules: [
          {
            id: 'approval-standard-amount',
            minAmount: 1,
            roleId: 'OrderModerator',
          },
        ],
      },
    },
    {
      id: 'APPROVED',
      name: 'Approved',
      type: 'normal',
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'REJECTED',
      name: 'Rejected',
      type: 'normal',
      editPolicy: Workflow.unlockedEditPolicy,
    },
    {
      id: 'CANCELLED',
      name: 'Cancelled',
      type: 'final',
      editPolicy: Workflow.lockedEditPolicy,
    },
    {
      id: 'CLOSED',
      name: 'Closed',
      type: 'final',
      editPolicy: Workflow.lockedEditPolicy,
    },
  ],
  transitions: [
    {
      id: 'draft-to-pending-approval',
      fromStatusId: 'DRAFT',
      toStatusId: 'PENDING_APPROVAL',
      label: 'Submit for approval',
      allowedRoles: ['OrderCreator', 'OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'a0',
      effects: [
        {
          id: 'notify-manager',
          type: 'SendNotification',
          label: 'Notify manager approvers',
        },
      ],
    },
    {
      id: 'draft-to-approved',
      fromStatusId: 'DRAFT',
      toStatusId: 'APPROVED',
      label: 'Approve',
      allowedRoles: ['OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'a1',
      effects: [
        {
          id: 'audit-draft-approval',
          type: 'CreateAuditLog',
          label: 'Audit approval from draft',
        },
      ],
    },
    {
      id: 'pending-approval-to-approved',
      fromStatusId: 'PENDING_APPROVAL',
      toStatusId: 'APPROVED',
      label: 'Approve',
      allowedRoles: ['OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'b0',
      effects: [
        {
          id: 'audit-approval',
          type: 'CreateAuditLog',
          label: 'Audit approval',
        },
      ],
    },
    {
      id: 'pending-approval-to-rejected',
      fromStatusId: 'PENDING_APPROVAL',
      toStatusId: 'REJECTED',
      label: 'Reject',
      allowedRoles: ['OrderCreator', 'OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'b1',
      effects: [
        {
          id: 'notify-rejection',
          type: 'SendNotification',
          label: 'Notify requester about rejection',
        },
      ],
    },
    {
      id: 'approved-to-cancelled',
      fromStatusId: 'APPROVED',
      toStatusId: 'CANCELLED',
      label: 'Cancel',
      allowedRoles: ['OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'c0',
      effects: [],
    },
    {
      id: 'approved-to-closed',
      fromStatusId: 'APPROVED',
      toStatusId: 'CLOSED',
      label: 'Close',
      allowedRoles: ['OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'c1',
      effects: [],
    },
    {
      id: 'rejected-to-pending-approval',
      fromStatusId: 'REJECTED',
      toStatusId: 'PENDING_APPROVAL',
      label: 'Resubmit for approval',
      allowedRoles: ['OrderCreator', 'OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'd0',
      effects: [],
    },
    {
      id: 'rejected-to-cancelled',
      fromStatusId: 'REJECTED',
      toStatusId: 'CANCELLED',
      label: 'Cancel',
      allowedRoles: ['OrderCreator', 'OrderModerator', 'OrderModeratorLimited', 'SystemAdmin'],
      requiresComment: false,
      sortOrder: 'd1',
      effects: [],
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
