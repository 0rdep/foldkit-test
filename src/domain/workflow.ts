import { Array, Option, Schema as S, String, pipe } from 'effect'
import { evo } from 'foldkit/struct'

export const StatusType = S.Literals(['draft', 'normal', 'final'])
export type StatusType = typeof StatusType.Type

export const FlowDefinitionState = S.Literals([
  'draft',
  'published',
  'archived',
])
export type FlowDefinitionState = typeof FlowDefinitionState.Type

export const EditableAction = S.Literals([
  'REQUISITION_NOTE',
  'REQUISITION_DELIVERY_DATE',
  'REQUISITION_DISCOUNT',
  'REQUISITION_ATTACHMENTS',
  'REQUISITION_DELETE',
  'REQUISITION_CREATE_ORDER',
  'REQUISITION_ITEM_EDIT',
  'ORDER_NOTE',
  'ORDER_DELIVERY_DATE',
  'ORDER_SUPPLIER',
  'ORDER_SUB_COMPANY',
  'ORDER_DISCOUNT',
  'ORDER_SHIPMENTS',
  'ORDER_DELETE',
  'ORDER_ITEM_EDIT',
])
export type EditableAction = typeof EditableAction.Type

export const AutomationType = S.Literals([
  'REQUISITION_ALL_ITEMS_LINKED',
  'REQUISITION_ITEM_UNLINKED',
  'ORDER_DELIVERY_FULLY_DELIVERED',
  'ORDER_DELIVERY_PARTIALLY_DELIVERED',
  'ORDER_DELIVERY_PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
  'ORDER_DELIVERY_REOPENED',
])
export type AutomationType = typeof AutomationType.Type

export const EditableActionDefinition = S.Struct({
  action: EditableAction,
  allowedRoles: S.Array(S.String),
})
export type EditableActionDefinition = typeof EditableActionDefinition.Type

export const EditPolicy = S.Array(EditableActionDefinition)
export type EditPolicy = typeof EditPolicy.Type

export const Status = S.Struct({
  id: S.String,
  name: S.String,
  type: StatusType,
  editPolicy: EditPolicy,
})
export type Status = typeof Status.Type

export const EffectType = S.Literals([
  'SyncExternalSystem',
  'SendNotification',
  'CreateAuditLog',
  'CallWebhook',
])
export type EffectType = typeof EffectType.Type

export const EffectDefinition = S.Struct({
  id: S.String,
  type: EffectType,
  label: S.String,
})
export type EffectDefinition = typeof EffectDefinition.Type

export const Transition = S.Struct({
  id: S.String,
  fromStatusId: S.String,
	toStatusId: S.String,
	allowedRoles: S.Array(S.String),
	automationOnly: S.optional(S.Boolean),
	automationType: S.optional(AutomationType),
	effects: S.Array(EffectDefinition),
})
export type Transition = typeof Transition.Type

export const DeliveryAutomation = S.Struct({
	enabled: S.Boolean,
	fullyDeliveredStatusId: S.String,
	partiallyDeliveredStatusId: S.String,
	partiallyDeliveredCompletionRequiredStatusId: S.String,
})
export type DeliveryAutomation = typeof DeliveryAutomation.Type

export const WorkflowDefinition = S.Struct({
  id: S.String,
  name: S.String,
  documentType: S.String,
  version: S.Number,
  state: S.optional(FlowDefinitionState),
  initialStatusId: S.String,
	statuses: S.Array(Status),
	transitions: S.Array(Transition),
	deliveryAutomation: S.optional(DeliveryAutomation),
})
export type WorkflowDefinition = typeof WorkflowDefinition.Type

export const Actor = S.Struct({
  id: S.String,
  name: S.String,
  roleIds: S.Array(S.String),
})
export type Actor = typeof Actor.Type

export const EffectStatus = S.Literals(['pending', 'succeeded', 'failed'])
export type EffectStatus = typeof EffectStatus.Type

export const EffectLogEntry = S.Struct({
  id: S.String,
  transitionId: S.String,
  type: EffectType,
  label: S.String,
  status: EffectStatus,
})
export type EffectLogEntry = typeof EffectLogEntry.Type

export const WorkflowEvent = S.Struct({
  id: S.String,
  label: S.String,
})
export type WorkflowEvent = typeof WorkflowEvent.Type

export const DocumentInstance = S.Struct({
  id: S.String,
  code: S.String,
  workflowId: S.String,
  workflowVersion: S.Number,
  amount: S.Number,
  currentStatusId: S.String,
  effectLog: S.Array(EffectLogEntry),
  eventLog: S.Array(WorkflowEvent),
})
export type DocumentInstance = typeof DocumentInstance.Type

export type AvailableTransition = {
  readonly id: string
  readonly label: string
  readonly toStatusName: string
}

export type BlockedTransition = {
  readonly id: string
  readonly label: string
  readonly reason: string
}

export type RuntimeState = {
  readonly documentId: string
  readonly currentStatus: Status
  readonly availableTransitions: ReadonlyArray<AvailableTransition>
  readonly blockedTransitions: ReadonlyArray<BlockedTransition>
  readonly editPolicy: EditPolicy
}

export type TransitionResult = {
  readonly document: DocumentInstance
  readonly result: 'transitioned' | 'blocked'
  readonly message: string
  readonly emittedEffects: ReadonlyArray<EffectLogEntry>
}

export const editableActions: ReadonlyArray<EditableAction> = [
  'REQUISITION_NOTE',
  'REQUISITION_DELIVERY_DATE',
  'REQUISITION_DISCOUNT',
  'REQUISITION_ATTACHMENTS',
  'REQUISITION_DELETE',
  'REQUISITION_CREATE_ORDER',
  'REQUISITION_ITEM_EDIT',
  'ORDER_NOTE',
  'ORDER_DELIVERY_DATE',
  'ORDER_SUPPLIER',
  'ORDER_SUB_COMPANY',
  'ORDER_DISCOUNT',
  'ORDER_SHIPMENTS',
  'ORDER_DELETE',
  'ORDER_ITEM_EDIT',
]

export type EditableActionGroup = Readonly<{
  title: string
  actions: ReadonlyArray<EditableAction>
}>

export const requisitionEditableActionGroups: ReadonlyArray<EditableActionGroup> = [
  {
    title: 'Requisition',
    actions: [
      'REQUISITION_NOTE',
      'REQUISITION_DELIVERY_DATE',
      'REQUISITION_DISCOUNT',
      'REQUISITION_ATTACHMENTS',
      'REQUISITION_DELETE',
      'REQUISITION_CREATE_ORDER',
    ],
  },
  { title: 'Requisition item', actions: ['REQUISITION_ITEM_EDIT'] },
]

export const orderEditableActionGroups: ReadonlyArray<EditableActionGroup> = [
  {
    title: 'Order',
    actions: [
      'ORDER_NOTE',
      'ORDER_DELIVERY_DATE',
      'ORDER_SUPPLIER',
      'ORDER_SUB_COMPANY',
      'ORDER_DISCOUNT',
      'ORDER_SHIPMENTS',
      'ORDER_DELETE',
    ],
  },
  { title: 'Order item', actions: ['ORDER_ITEM_EDIT'] },
]

export const requisitionEditableActions: ReadonlyArray<EditableAction> =
  Array.flatten(Array.map(requisitionEditableActionGroups, group => group.actions))

export const orderEditableActions: ReadonlyArray<EditableAction> = Array.flatten(
  Array.map(orderEditableActionGroups, group => group.actions),
)

export const editableActionGroupsForDocumentType = (
  documentType: string,
): ReadonlyArray<EditableActionGroup> =>
  String.toLowerCase(documentType) === 'order'
    ? orderEditableActionGroups
    : requisitionEditableActionGroups

export const editableActionsForDocumentType = (
  documentType: string,
): ReadonlyArray<EditableAction> =>
  String.toLowerCase(documentType) === 'order'
    ? orderEditableActions
    : requisitionEditableActions

const requisitionWriteRoles = [
  'SystemAdmin',
  'OrderModerator',
  'OrderModeratorLimited',
  'OrderCreator',
]

export const editableAction = (
  action: EditableAction,
  allowedRoles: ReadonlyArray<string>,
): EditableActionDefinition => ({ action, allowedRoles: [...allowedRoles] })

export const editableActionFromLegacy = (
  documentType: string,
  action: string,
): Option.Option<EditableAction> => {
  const isOrder = String.toLowerCase(documentType) === 'order'

  if (isOrder) {
    if (action === 'note') {
      return Option.some('ORDER_NOTE')
    }
    if (action === 'deliveryDate') {
      return Option.some('ORDER_DELIVERY_DATE')
    }
    if (action === 'items') {
      return Option.some('ORDER_ITEM_EDIT')
    }
    if (action === 'discount') {
      return Option.some('ORDER_DISCOUNT')
    }
    if (action === 'supplier') {
      return Option.some('ORDER_SUPPLIER')
    }
    if (action === 'subCompany') {
      return Option.some('ORDER_SUB_COMPANY')
    }
    if (action === 'shipments') {
      return Option.some('ORDER_SHIPMENTS')
    }
    if (action === 'delete') {
      return Option.some('ORDER_DELETE')
    }
    return Option.none()
  }

  if (action === 'note') {
    return Option.some('REQUISITION_NOTE')
  }
  if (action === 'deliveryDate') {
    return Option.some('REQUISITION_DELIVERY_DATE')
  }
  if (action === 'items') {
    return Option.some('REQUISITION_ITEM_EDIT')
  }
  if (action === 'discount') {
    return Option.some('REQUISITION_DISCOUNT')
  }
  if (action === 'attachments') {
    return Option.some('REQUISITION_ATTACHMENTS')
  }
  if (action === 'createOrder') {
    return Option.some('REQUISITION_CREATE_ORDER')
  }
  if (action === 'delete') {
    return Option.some('REQUISITION_DELETE')
  }
  if (Array.contains(editableActions, action as EditableAction)) {
    return Option.some(action as EditableAction)
  }
  return Option.none()
}

export const editPolicyFromActions = (
  actions: ReadonlyArray<EditableAction>,
  allowedRoles: ReadonlyArray<string>,
): EditPolicy =>
  Array.map(actions, action => editableAction(action, allowedRoles))

export const rolesForEditableAction = (
  editPolicy: EditPolicy,
  action: EditableAction,
): ReadonlyArray<string> =>
  Option.getOrElse(
    Array.findFirst(editPolicy, definition => definition.action === action),
    () => editableAction(action, []),
  ).allowedRoles

export const canRoleEditAction = (
  editPolicy: EditPolicy,
  action: EditableAction,
  roleId: string,
): boolean => Array.contains(rolesForEditableAction(editPolicy, action), roleId)

export const unlockedEditPolicy: EditPolicy = editPolicyFromActions(
  [
    'REQUISITION_NOTE',
    'REQUISITION_DELIVERY_DATE',
    'REQUISITION_ITEM_EDIT',
    'REQUISITION_DISCOUNT',
    'REQUISITION_ATTACHMENTS',
    'REQUISITION_DELETE',
  ],
  requisitionWriteRoles,
)

export const lockedEditPolicy: EditPolicy = []

export const findStatus = (
  workflow: WorkflowDefinition,
  statusId: string,
): Option.Option<Status> =>
  pipe(
    workflow.statuses,
    Array.findFirst(status => status.id === statusId),
  )

export const findTransition = (
  workflow: WorkflowDefinition,
  transitionId: string,
): Option.Option<Transition> =>
  pipe(
    workflow.transitions,
    Array.findFirst(transition => transition.id === transitionId),
  )

export const transitionLabel = (
  workflow: WorkflowDefinition,
  transition: Transition,
): string =>
  Option.match(findStatus(workflow, transition.toStatusId), {
    onNone: () => transition.toStatusId,
    onSome: status => status.name,
  })

export const findActor = (
  actors: ReadonlyArray<Actor>,
  actorId: string,
): Option.Option<Actor> =>
  pipe(
    actors,
    Array.findFirst(actor => actor.id === actorId),
  )

export const findDocument = (
  documents: ReadonlyArray<DocumentInstance>,
  documentId: string,
): Option.Option<DocumentInstance> =>
  pipe(
    documents,
    Array.findFirst(document => document.id === documentId),
  )

export const roleLabel = (roleId: string): string =>
  pipe(
    roleId,
    String.split('-'),
    Array.map(
      word => `${String.toUpperCase(word.slice(0, 1))}${word.slice(1)}`,
    ),
    Array.join(' '),
  )

export const statusTypeLabel = (statusType: StatusType): string => {
  if (statusType === 'final') {
    return 'Final'
  }
  if (statusType === 'draft') {
    return 'Draft'
  }
  return 'Normal'
}

export const effectTypeLabel = (effectType: EffectType): string => {
  if (effectType === 'SyncExternalSystem') {
    return 'Sync external system'
  }
  if (effectType === 'SendNotification') {
    return 'Send notification'
  }
  if (effectType === 'CreateAuditLog') {
    return 'Create audit log'
  }
  return 'Call webhook'
}

export const editableActionLabel = (action: EditableAction): string => {
  if (action === 'REQUISITION_DELIVERY_DATE') {
    return 'Delivery date'
  }
  if (action === 'ORDER_DELIVERY_DATE') {
    return 'Delivery date'
  }
  if (action === 'REQUISITION_ITEM_EDIT') {
    return 'Edit items'
  }
  if (action === 'ORDER_ITEM_EDIT') {
    return 'Edit items'
  }
  if (action === 'REQUISITION_DISCOUNT') {
    return 'Discount'
  }
  if (action === 'ORDER_DISCOUNT') {
    return 'Discount'
  }
  if (action === 'REQUISITION_ATTACHMENTS') {
    return 'Attachments'
  }
  if (action === 'ORDER_SUPPLIER') {
    return 'Supplier'
  }
  if (action === 'ORDER_SUB_COMPANY') {
    return 'Sub-company'
  }
  if (action === 'ORDER_SHIPMENTS') {
    return 'Shipments'
  }
  if (action === 'REQUISITION_CREATE_ORDER') {
    return 'Create order'
  }
  if (action === 'REQUISITION_DELETE') {
    return 'Delete'
  }
  if (action === 'ORDER_DELETE') {
    return 'Delete'
  }
  if (action === 'ORDER_NOTE') {
    return 'Note'
  }
  return 'Note'
}

const actorHasRole = (actor: Actor, roleId: string): boolean =>
  Array.contains(actor.roleIds, roleId)

const canActorExecuteTransition = (
  actor: Actor,
  transition: Transition,
): boolean =>
  Array.some(transition.allowedRoles, roleId => actorHasRole(actor, roleId))

export const runtimeState = (
  workflow: WorkflowDefinition,
  document: DocumentInstance,
  actor: Actor,
): RuntimeState => {
  const fallbackStatus: Status = {
    id: 'missing-status',
    name: 'Missing status',
    type: 'final',
    editPolicy: lockedEditPolicy,
  }
  const currentStatus = Option.getOrElse(
    findStatus(workflow, document.currentStatusId),
    () => workflow.statuses[0] ?? fallbackStatus,
  )

  const outgoingTransitions = Array.filter(
    workflow.transitions,
    transition => transition.fromStatusId === document.currentStatusId,
  )

  const availableTransitions = pipe(
    outgoingTransitions,
    Array.flatMap(transition => {
      if (!canActorExecuteTransition(actor, transition)) {
        return []
      }

      const toStatusName = transitionLabel(workflow, transition)

      return [
        {
          id: transition.id,
          label: toStatusName,
          toStatusName,
        },
      ]
    }),
  )

  const blockedTransitions = pipe(
    outgoingTransitions,
    Array.flatMap(transition => {
      if (!canActorExecuteTransition(actor, transition)) {
        return [
          {
            id: transition.id,
            label: transitionLabel(workflow, transition),
            reason: `Requires one of: ${Array.join(
              Array.map(transition.allowedRoles, roleLabel),
              ', ',
            )}`,
          },
        ]
      }

      return []
    }),
  )

  return {
    documentId: document.id,
    currentStatus,
    availableTransitions,
    blockedTransitions,
    editPolicy: currentStatus.editPolicy,
  }
}

const appendEvent = (
  document: DocumentInstance,
  id: string,
  label: string,
): DocumentInstance =>
  evo(document, {
    eventLog: eventLog => [...eventLog, { id, label }],
  })

const effectEntries = (
  transition: Transition,
  idPrefix: string,
): ReadonlyArray<EffectLogEntry> =>
  Array.map(transition.effects, (effect, index) => ({
    id: `${idPrefix}-effect-${index + 1}`,
    transitionId: transition.id,
    type: effect.type,
    label: effect.label,
    status: 'pending',
  }))

const completeTransition = (
  workflow: WorkflowDefinition,
  document: DocumentInstance,
  transition: Transition,
  actor: Actor,
  eventId: string,
): TransitionResult => {
  const effects = effectEntries(transition, eventId)
  const label = transitionLabel(workflow, transition)
  const nextDocument = appendEvent(
    evo(document, {
      currentStatusId: () => transition.toStatusId,
      effectLog: effectLog => [...effectLog, ...effects],
    }),
    eventId,
    `${actor.name} completed ${label}`,
  )

  return {
    document: nextDocument,
    result: 'transitioned',
    message: `${label} completed`,
    emittedEffects: effects,
  }
}

export const requestTransition = (
  workflow: WorkflowDefinition,
  document: DocumentInstance,
  actor: Actor,
  transitionId: string,
  idPrefix: string,
): TransitionResult =>
  Option.match(findTransition(workflow, transitionId), {
    onNone: () => ({
      document,
      result: 'blocked',
      message: 'Transition was not found',
      emittedEffects: [],
    }),
    onSome: transition => {
      if (transition.fromStatusId !== document.currentStatusId) {
        return {
          document,
          result: 'blocked',
          message: 'Transition is not available from the current status',
          emittedEffects: [],
        }
      }

      if (!canActorExecuteTransition(actor, transition)) {
        return {
          document,
          result: 'blocked',
          message: 'Actor cannot execute this transition',
          emittedEffects: [],
        }
      }

      return completeTransition(workflow, document, transition, actor, idPrefix)
    },
  })

export const replaceDocument = (
  documents: ReadonlyArray<DocumentInstance>,
  document: DocumentInstance,
): ReadonlyArray<DocumentInstance> =>
  Array.map(documents, current =>
    current.id === document.id ? document : current,
  )

export const updateStatus = (
  workflow: WorkflowDefinition,
  statusId: string,
  f: (status: Status) => Status,
): WorkflowDefinition =>
  evo(workflow, {
    statuses: statuses =>
      Array.map(statuses, status =>
        status.id === statusId ? f(status) : status,
      ),
  })

export const updateTransition = (
  workflow: WorkflowDefinition,
  transitionId: string,
  f: (transition: Transition) => Transition,
): WorkflowDefinition =>
  evo(workflow, {
    transitions: transitions =>
      Array.map(transitions, transition =>
        transition.id === transitionId ? f(transition) : transition,
      ),
  })

export const validateWorkflow = (
  workflow: WorkflowDefinition,
): ReadonlyArray<string> => {
  const hasInitialStatus = Option.isSome(
    findStatus(workflow, workflow.initialStatusId),
  )
  const missingInitial = hasInitialStatus ? [] : ['Initial status is missing']
  const transitionProblems = pipe(
    workflow.transitions,
    Array.flatMap(transition => [
      ...Array.match(transition.allowedRoles, {
        onEmpty: () => [
          `${transitionLabel(workflow, transition)} has no execution roles`,
        ],
        onNonEmpty: () => [],
      }),
      ...Option.match(findStatus(workflow, transition.fromStatusId), {
        onNone: () => [
          `${transitionLabel(workflow, transition)} has a missing source status`,
        ],
        onSome: () => [],
      }),
      ...Option.match(findStatus(workflow, transition.toStatusId), {
        onNone: () => [
          `${transitionLabel(workflow, transition)} has a missing target status`,
        ],
        onSome: () => [],
      }),
    ]),
  )
  return [...missingInitial, ...transitionProblems]
}
