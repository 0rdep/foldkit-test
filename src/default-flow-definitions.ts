import { Workflow } from './domain'

type FlowDocumentType = 'requisition' | 'order'

const allRoles: ReadonlyArray<string> = [
  'CatalogManager',
  'ClientUser',
  'OrderCreator',
  'OrderModerator',
  'OrderModeratorLimited',
  'SystemAdmin',
]

const requisitionWriteRoles: ReadonlyArray<string> = [
  'SystemAdmin',
  'OrderModerator',
  'OrderModeratorLimited',
  'OrderCreator',
]

const requisitionFullEditRoles: ReadonlyArray<string> = [
  'SystemAdmin',
  'OrderModerator',
]

const orderWriteRoles: ReadonlyArray<string> = [
  'SystemAdmin',
  'OrderModerator',
  'OrderCreator',
]

const orderLimitedEditRoles: ReadonlyArray<string> = [
  ...orderWriteRoles,
  'OrderModeratorLimited',
]

const editableAction = (
  action: Workflow.EditableAction,
  allowedRoles: ReadonlyArray<string>,
): Workflow.EditableActionDefinition =>
  Workflow.editableAction(action, allowedRoles)

const transitionDefinition = (config: {
  readonly id: string
  readonly fromStatusId: string
  readonly toStatusId: string
  readonly allowedRoles: ReadonlyArray<string>
  readonly automationOnly?: boolean
}): Workflow.Transition => ({
  id: config.id,
  fromStatusId: config.fromStatusId,
  toStatusId: config.toStatusId,
  allowedRoles: [...config.allowedRoles],
  automationOnly: config.automationOnly,
  effects: [],
})

const duplicateAction = editableAction('duplicate', orderWriteRoles)
const requisitionDuplicateAction = editableAction(
  'duplicate',
  requisitionWriteRoles,
)

export const DEFAULT_REQUISITION_FLOW: Workflow.WorkflowDefinition = {
  id: 'default-requisition-flow',
  name: 'Default requisition flow',
  documentType: 'requisition',
  version: 1,
  state: 'published',
  initialStatusId: 'DRAFT',
  statuses: [
    {
      id: 'DRAFT',
      name: 'Draft',
      type: 'draft',
      editPolicy: [
        editableAction('note', requisitionWriteRoles),
        editableAction('deliveryDate', requisitionWriteRoles),
        editableAction('items', requisitionWriteRoles),
        editableAction('discount', requisitionWriteRoles),
        editableAction('attachments', requisitionWriteRoles),
        editableAction('delete', requisitionWriteRoles),
        requisitionDuplicateAction,
      ],
    },
    {
      id: 'PENDING_APPROVAL',
      name: 'Pending Approval',
      type: 'normal',
      editPolicy: [
        editableAction('note', requisitionFullEditRoles),
        editableAction('deliveryDate', requisitionFullEditRoles),
        editableAction('items', requisitionFullEditRoles),
        editableAction('discount', requisitionFullEditRoles),
        editableAction('attachments', requisitionWriteRoles),
        requisitionDuplicateAction,
      ],
    },
    {
      id: 'APPROVED',
      name: 'Approved',
      type: 'normal',
      editPolicy: [
        editableAction('note', requisitionFullEditRoles),
        editableAction('deliveryDate', requisitionFullEditRoles),
        editableAction('items', requisitionFullEditRoles),
        editableAction('attachments', requisitionWriteRoles),
        requisitionDuplicateAction,
      ],
    },
    {
      id: 'REJECTED',
      name: 'Rejected',
      type: 'normal',
      editPolicy: [
        editableAction('note', requisitionWriteRoles),
        editableAction('deliveryDate', requisitionWriteRoles),
        editableAction('items', requisitionWriteRoles),
        requisitionDuplicateAction,
      ],
    },
    {
      id: 'CANCELLED',
      name: 'Cancelled',
      type: 'final',
      editPolicy: [
        editableAction('note', requisitionFullEditRoles),
        requisitionDuplicateAction,
      ],
    },
    {
      id: 'CLOSED',
      name: 'Closed',
      type: 'final',
      editPolicy: [requisitionDuplicateAction],
    },
  ],
  transitions: [
    transitionDefinition({
      id: 'draft-to-pending-approval',
      fromStatusId: 'DRAFT',
      toStatusId: 'PENDING_APPROVAL',
      allowedRoles: requisitionWriteRoles,
    }),
    transitionDefinition({
      id: 'draft-to-approved',
      fromStatusId: 'DRAFT',
      toStatusId: 'APPROVED',
      allowedRoles: ['SystemAdmin', 'OrderModerator', 'OrderModeratorLimited'],
    }),
    transitionDefinition({
      id: 'pending-approval-to-approved',
      fromStatusId: 'PENDING_APPROVAL',
      toStatusId: 'APPROVED',
      allowedRoles: ['SystemAdmin', 'OrderModerator', 'OrderModeratorLimited'],
    }),
    transitionDefinition({
      id: 'pending-approval-to-rejected',
      fromStatusId: 'PENDING_APPROVAL',
      toStatusId: 'REJECTED',
      allowedRoles: requisitionWriteRoles,
    }),
    transitionDefinition({
      id: 'approved-to-cancelled',
      fromStatusId: 'APPROVED',
      toStatusId: 'CANCELLED',
      allowedRoles: ['SystemAdmin', 'OrderModerator', 'OrderModeratorLimited'],
    }),
    transitionDefinition({
      id: 'approved-to-closed',
      fromStatusId: 'APPROVED',
      toStatusId: 'CLOSED',
      allowedRoles: ['SystemAdmin', 'OrderModerator', 'OrderModeratorLimited'],
    }),
    transitionDefinition({
      id: 'rejected-to-pending-approval',
      fromStatusId: 'REJECTED',
      toStatusId: 'PENDING_APPROVAL',
      allowedRoles: requisitionWriteRoles,
    }),
    transitionDefinition({
      id: 'rejected-to-cancelled',
      fromStatusId: 'REJECTED',
      toStatusId: 'CANCELLED',
      allowedRoles: requisitionWriteRoles,
    }),
  ],
}

export const DEFAULT_ORDER_FLOW: Workflow.WorkflowDefinition = {
  id: 'default-order-flow',
  name: 'Default order flow',
  documentType: 'order',
  version: 1,
  state: 'published',
  initialStatusId: 'DRAFT',
  statuses: [
    {
      id: 'DRAFT',
      name: 'Draft',
      type: 'draft',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('deliveryDate', orderWriteRoles),
        editableAction('supplier', orderWriteRoles),
        editableAction('items', orderLimitedEditRoles),
        editableAction('discount', orderLimitedEditRoles),
        editableAction('attachments', orderWriteRoles),
        editableAction('delete', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'AWAITING_DELIVERY',
      name: 'Awaiting Delivery',
      type: 'normal',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('attachments', orderWriteRoles),
        editableAction('shipments', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'PARTIALLY_DELIVERED',
      name: 'Partially Delivered',
      type: 'normal',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('items', orderLimitedEditRoles),
        editableAction('attachments', orderWriteRoles),
        editableAction('shipments', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
      name: 'Partially Delivered Completion Required',
      type: 'normal',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('items', orderLimitedEditRoles),
        editableAction('attachments', orderWriteRoles),
        editableAction('shipments', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'DELIVERED',
      name: 'Delivered',
      type: 'normal',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('items', orderLimitedEditRoles),
        editableAction('attachments', orderWriteRoles),
        editableAction('shipments', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'IN_REVISION',
      name: 'In Revision',
      type: 'normal',
      editPolicy: [
        editableAction('note', orderWriteRoles),
        editableAction('deliveryDate', orderWriteRoles),
        editableAction('supplier', orderWriteRoles),
        editableAction('items', orderWriteRoles),
        editableAction('discount', orderWriteRoles),
        editableAction('attachments', orderWriteRoles),
        duplicateAction,
      ],
    },
    {
      id: 'CANCELLED',
      name: 'Cancelled',
      type: 'final',
      editPolicy: [editableAction('note', orderWriteRoles), duplicateAction],
    },
  ],
  transitions: [
    transitionDefinition({
      id: 'draft-to-awaiting-delivery',
      fromStatusId: 'DRAFT',
      toStatusId: 'AWAITING_DELIVERY',
      allowedRoles: orderWriteRoles,
    }),
    transitionDefinition({
      id: 'awaiting-delivery-to-delivered',
      fromStatusId: 'AWAITING_DELIVERY',
      toStatusId: 'DELIVERED',
      allowedRoles: [],
      automationOnly: true,
    }),
    transitionDefinition({
      id: 'awaiting-delivery-to-partially-delivered',
      fromStatusId: 'AWAITING_DELIVERY',
      toStatusId: 'PARTIALLY_DELIVERED',
      allowedRoles: [],
      automationOnly: true,
    }),
    transitionDefinition({
      id: 'awaiting-delivery-to-partially-delivered-completion-required',
      fromStatusId: 'AWAITING_DELIVERY',
      toStatusId: 'PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
      allowedRoles: [],
      automationOnly: true,
    }),
    transitionDefinition({
      id: 'awaiting-delivery-to-in-revision',
      fromStatusId: 'AWAITING_DELIVERY',
      toStatusId: 'IN_REVISION',
      allowedRoles: allRoles,
    }),
    transitionDefinition({
      id: 'awaiting-delivery-to-cancelled',
      fromStatusId: 'AWAITING_DELIVERY',
      toStatusId: 'CANCELLED',
      allowedRoles: allRoles,
    }),
    transitionDefinition({
      id: 'delivered-to-in-revision',
      fromStatusId: 'DELIVERED',
      toStatusId: 'IN_REVISION',
      allowedRoles: allRoles,
    }),
    transitionDefinition({
      id: 'partially-delivered-to-delivered',
      fromStatusId: 'PARTIALLY_DELIVERED',
      toStatusId: 'DELIVERED',
      allowedRoles: [],
      automationOnly: true,
    }),
    transitionDefinition({
      id: 'partially-delivered-completion-required-to-delivered',
      fromStatusId: 'PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
      toStatusId: 'DELIVERED',
      allowedRoles: [],
      automationOnly: true,
    }),
    transitionDefinition({
      id: 'in-revision-to-awaiting-delivery',
      fromStatusId: 'IN_REVISION',
      toStatusId: 'AWAITING_DELIVERY',
      allowedRoles: allRoles,
    }),
    transitionDefinition({
      id: 'in-revision-to-delivered',
      fromStatusId: 'IN_REVISION',
      toStatusId: 'DELIVERED',
      allowedRoles: allRoles,
    }),
    transitionDefinition({
      id: 'in-revision-to-cancelled',
      fromStatusId: 'IN_REVISION',
      toStatusId: 'CANCELLED',
      allowedRoles: allRoles,
    }),
  ],
  deliveryAutomation: {
    enabled: true,
    fullyDeliveredStatusId: 'DELIVERED',
    partiallyDeliveredStatusId: 'PARTIALLY_DELIVERED',
    partiallyDeliveredCompletionRequiredStatusId:
      'PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
  },
}

export const defaultWorkflowForDocumentType = (
  documentType: FlowDocumentType,
): Workflow.WorkflowDefinition =>
  documentType === 'order' ? DEFAULT_ORDER_FLOW : DEFAULT_REQUISITION_FLOW
