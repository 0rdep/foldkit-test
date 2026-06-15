import { Array, Option, Schema as S, String, pipe } from 'effect'
import { evo } from 'foldkit/struct'

export const StatusType = S.Literals([
  'draft',
  'normal',
  'approval',
  'final',
])
export type StatusType = typeof StatusType.Type

export const EditableAction = S.Literals([
  'note',
  'deliveryDate',
  'items',
  'discount',
  'attachments',
  'supplier',
  'subCompany',
  'shipments',
  'delete',
  'duplicate',
])
export type EditableAction = typeof EditableAction.Type

export const EditableActionDefinition = S.Struct({
  action: EditableAction,
  allowedRoles: S.Array(S.String),
})
export type EditableActionDefinition = typeof EditableActionDefinition.Type

export const EditPolicy = S.Array(EditableActionDefinition)
export type EditPolicy = typeof EditPolicy.Type

export const ApprovalMode = S.Literals(['all', 'any'])
export type ApprovalMode = typeof ApprovalMode.Type

export const ApprovalRule = S.Struct({
  id: S.String,
  minAmount: S.Number,
  roleId: S.String,
})
export type ApprovalRule = typeof ApprovalRule.Type

export const ApprovalConfig = S.Struct({
  rules: S.Array(ApprovalRule),
  approvedTransitionId: S.String,
  rejectedTransitionId: S.String,
  allowSelfApproval: S.Boolean,
})
export type ApprovalConfig = typeof ApprovalConfig.Type

export const Status = S.Struct({
  id: S.String,
  name: S.String,
  type: StatusType,
  editPolicy: EditPolicy,
  approval: S.optional(ApprovalConfig),
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
  label: S.String,
  allowedRoles: S.Array(S.String),
  requiresComment: S.Boolean,
  sortOrder: S.String,
  effects: S.Array(EffectDefinition),
})
export type Transition = typeof Transition.Type

export const WorkflowDefinition = S.Struct({
  id: S.String,
  name: S.String,
  documentType: S.String,
  version: S.Number,
  initialStatusId: S.String,
  statuses: S.Array(Status),
  transitions: S.Array(Transition),
})
export type WorkflowDefinition = typeof WorkflowDefinition.Type

export const Actor = S.Struct({
  id: S.String,
  name: S.String,
  roleIds: S.Array(S.String),
})
export type Actor = typeof Actor.Type

export const ApprovalRecord = S.Struct({
  id: S.String,
  statusId: S.String,
  approvalRuleId: S.String,
  actorId: S.String,
  roleId: S.String,
})
export type ApprovalRecord = typeof ApprovalRecord.Type

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
  approvals: S.Array(ApprovalRecord),
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

export type PendingApproval = {
  readonly statusId: string
  readonly approvalRuleId: string
  readonly roleId: string
  readonly approvedCount: number
  readonly amountRange: string
}

export type RuntimeState = {
  readonly documentId: string
  readonly currentStatus: Status
  readonly availableTransitions: ReadonlyArray<AvailableTransition>
  readonly blockedTransitions: ReadonlyArray<BlockedTransition>
  readonly editPolicy: EditPolicy
  readonly pendingApprovals: ReadonlyArray<PendingApproval>
}

export type TransitionResult = {
  readonly document: DocumentInstance
  readonly result: 'transitioned' | 'approvalRecorded' | 'blocked'
  readonly message: string
  readonly emittedEffects: ReadonlyArray<EffectLogEntry>
}

export const editableActions: ReadonlyArray<EditableAction> = [
  'note',
  'deliveryDate',
  'items',
  'discount',
  'attachments',
  'supplier',
  'subCompany',
  'shipments',
  'delete',
  'duplicate',
]

const requisitionWriteRoles = [
  'SystemAdmin',
  'OrderModerator',
  'OrderModeratorLimited',
  'OrderCreator',
]

const requisitionFullEditRoles = ['SystemAdmin', 'OrderModerator']

export const editableAction = (
  action: EditableAction,
  allowedRoles: ReadonlyArray<string>,
): EditableActionDefinition => ({ action, allowedRoles: [...allowedRoles] })

export const editPolicyFromActions = (
  actions: ReadonlyArray<EditableAction>,
  allowedRoles: ReadonlyArray<string>,
): EditPolicy => Array.map(actions, action => editableAction(action, allowedRoles))

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
  ['note', 'deliveryDate', 'items', 'discount', 'attachments', 'delete', 'duplicate'],
  requisitionWriteRoles,
)

export const lockedEditPolicy: EditPolicy = []

export const approvalEditPolicy: EditPolicy = [
  editableAction('note', requisitionFullEditRoles),
  editableAction('deliveryDate', requisitionFullEditRoles),
  editableAction('items', requisitionFullEditRoles),
  editableAction('discount', requisitionFullEditRoles),
  editableAction('attachments', requisitionWriteRoles),
  editableAction('duplicate', requisitionWriteRoles),
]

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
  if (statusType === 'approval') {
    return 'Approval'
  }
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
  if (action === 'deliveryDate') {
    return 'Delivery date'
  }
  if (action === 'items') {
    return 'Items'
  }
  if (action === 'discount') {
    return 'Discount'
  }
  if (action === 'attachments') {
    return 'Attachments'
  }
  if (action === 'supplier') {
    return 'Supplier'
  }
  if (action === 'subCompany') {
    return 'Sub-company'
  }
  if (action === 'shipments') {
    return 'Shipments'
  }
  if (action === 'delete') {
    return 'Delete'
  }
  if (action === 'duplicate') {
    return 'Duplicate'
  }
  return 'Note'
}

const isAmountInRule = (amount: number, rule: ApprovalRule): boolean =>
  amount >= rule.minAmount

const actorHasRole = (actor: Actor, roleId: string): boolean =>
  Array.contains(actor.roleIds, roleId)

const canActorExecuteTransition = (
  actor: Actor,
  transition: Transition,
): boolean =>
  Array.some(transition.allowedRoles, roleId => actorHasRole(actor, roleId))

const matchingRules = (
  approval: ApprovalConfig,
  amount: number,
): ReadonlyArray<ApprovalRule> =>
  Array.filter(approval.rules, rule => isAmountInRule(amount, rule))

const approvalsForStatus = (
  document: DocumentInstance,
  statusId: string,
): ReadonlyArray<ApprovalRecord> =>
  Array.filter(
    document.approvals,
    approval => approval.statusId === statusId,
  )

const approvalsForRule = (
  approvals: ReadonlyArray<ApprovalRecord>,
  ruleId: string,
): ReadonlyArray<ApprovalRecord> =>
  Array.filter(approvals, approval => approval.approvalRuleId === ruleId)

const amountRangeLabel = (rule: ApprovalRule): string => {
  if (rule.minAmount <= 1) {
    return 'all amounts'
  }
  return `amounts from ${rule.minAmount}`
}

const canActorApproveRule = (actor: Actor, rule: ApprovalRule): boolean =>
  actorHasRole(actor, rule.roleId)

const alreadyApproved = (
  document: DocumentInstance,
  statusId: string,
  actorId: string,
): boolean =>
  pipe(
    approvalsForStatus(document, statusId),
    Array.some(approval => approval.actorId === actorId),
  )

const isApprovalRuleComplete = (
  rule: ApprovalRule,
  approvals: ReadonlyArray<ApprovalRecord>,
): boolean => {
  return approvalsForRule(approvals, rule.id).length > 0
}

const isApprovedOutputTransition = (
  status: Status,
  transition: Transition,
): boolean => status.approval?.approvedTransitionId === transition.id

const nextApprovableRule = (
  approval: ApprovalConfig,
  document: DocumentInstance,
  statusId: string,
  actor: Actor,
): Option.Option<ApprovalRule> =>
  pipe(
    matchingRules(approval, document.amount),
    Array.findFirst(
      rule =>
        canActorApproveRule(actor, rule) &&
        !isApprovalRuleComplete(rule, approvalsForStatus(document, statusId)),
    ),
  )

const areMatchingApprovalRulesComplete = (
  approval: ApprovalConfig,
  document: DocumentInstance,
  statusId: string,
): boolean => {
  const approvals = approvalsForStatus(document, statusId)
  return pipe(
    matchingRules(approval, document.amount),
    Array.every(rule => isApprovalRuleComplete(rule, approvals)),
  )
}

export const pendingApprovalsForDocument = (
  workflow: WorkflowDefinition,
  document: DocumentInstance,
): ReadonlyArray<PendingApproval> =>
  pipe(
    workflow.statuses,
    Array.filter(status => status.id === document.currentStatusId),
    Array.flatMap(status => {
      if (status.approval === undefined) {
        return []
      }
      const rules = matchingRules(status.approval, document.amount)
      const approvals = approvalsForStatus(document, status.id)
      return Array.map(rules, rule => ({
        statusId: status.id,
        approvalRuleId: rule.id,
        roleId: rule.roleId,
        approvedCount: approvalsForRule(approvals, rule.id).length,
        amountRange: amountRangeLabel(rule),
      }))
    }),
  )

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

      const maybeToStatus = findStatus(workflow, transition.toStatusId)
      const toStatusName = Option.match(maybeToStatus, {
        onNone: () => transition.toStatusId,
        onSome: status => status.name,
      })

      if (!isApprovedOutputTransition(currentStatus, transition)) {
        return [
          {
            id: transition.id,
            label: transition.label,
            toStatusName,
          },
        ]
      }

      const maybeRule = currentStatus.approval
        ? nextApprovableRule(currentStatus.approval, document, currentStatus.id, actor)
        : Option.none()

      if (Option.isNone(maybeRule) || alreadyApproved(document, currentStatus.id, actor.id)) {
        return []
      }

      return [
        {
          id: transition.id,
          label: transition.label,
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
            label: transition.label,
            reason: `Requires one of: ${Array.join(
              Array.map(transition.allowedRoles, roleLabel),
              ', ',
            )}`,
          },
        ]
      }

      if (!isApprovedOutputTransition(currentStatus, transition)) {
        return []
      }

      const maybeRule = currentStatus.approval
        ? nextApprovableRule(currentStatus.approval, document, currentStatus.id, actor)
        : Option.none()

      if (alreadyApproved(document, currentStatus.id, actor.id)) {
        return [
          {
            id: transition.id,
            label: transition.label,
            reason: 'This actor already approved this status',
          },
        ]
      }

      if (Option.isNone(maybeRule)) {
        const maybeRequiredRule = currentStatus.approval
          ? pipe(
              matchingRules(currentStatus.approval, document.amount),
              Array.findFirst(
                rule =>
                  !isApprovalRuleComplete(
                    rule,
                    approvalsForStatus(document, currentStatus.id),
                  ),
              ),
            )
          : Option.none()

        return Option.match(maybeRequiredRule, {
          onNone: () => [],
          onSome: rule => [
            {
              id: transition.id,
              label: transition.label,
              reason: `Requires ${roleLabel(rule.roleId)}`,
            },
          ],
        })
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
    pendingApprovals: pendingApprovalsForDocument(workflow, document),
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
  document: DocumentInstance,
  transition: Transition,
  actor: Actor,
  eventId: string,
): TransitionResult => {
  const effects = effectEntries(transition, eventId)
  const nextDocument = appendEvent(
    evo(document, {
      currentStatusId: () => transition.toStatusId,
      approvals: approvals =>
        Array.filter(
          approvals,
          approval => approval.statusId !== transition.fromStatusId,
        ),
      effectLog: effectLog => [...effectLog, ...effects],
    }),
    eventId,
    `${actor.name} completed ${transition.label}`,
  )

  return {
    document: nextDocument,
    result: 'transitioned',
    message: `${transition.label} completed`,
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

      const currentStatus = Option.getOrElse(
        findStatus(workflow, document.currentStatusId),
        () => ({
          id: document.currentStatusId,
          name: document.currentStatusId,
          type: 'normal' as const,
          editPolicy: lockedEditPolicy,
          approval: undefined,
        }),
      )

      if (!canActorExecuteTransition(actor, transition)) {
        return {
          document,
          result: 'blocked',
          message: 'Actor cannot execute this transition',
          emittedEffects: [],
        }
      }

      if (!isApprovedOutputTransition(currentStatus, transition)) {
        return completeTransition(document, transition, actor, idPrefix)
      }

      if (currentStatus.approval === undefined) {
        return completeTransition(document, transition, actor, idPrefix)
      }

      if (alreadyApproved(document, currentStatus.id, actor.id)) {
        return {
          document,
          result: 'blocked',
          message: 'This actor already approved this status',
          emittedEffects: [],
        }
      }

      const maybeRule = nextApprovableRule(
        currentStatus.approval,
        document,
        currentStatus.id,
        actor,
      )

      if (Option.isNone(maybeRule)) {
        return {
          document,
          result: 'blocked',
          message: 'Actor cannot approve this status',
          emittedEffects: [],
        }
      }

      const rule = maybeRule.value
      const nextApproval: ApprovalRecord = {
        id: `${idPrefix}-approval`,
        statusId: currentStatus.id,
        approvalRuleId: rule.id,
        actorId: actor.id,
        roleId: rule.roleId,
      }
      const approvals = [...document.approvals, nextApproval]
      const approvedDocument = appendEvent(
        evo(document, { approvals: () => approvals }),
        idPrefix,
        `${actor.name} approved ${transition.label}`,
      )

      if (
        areMatchingApprovalRulesComplete(
          currentStatus.approval,
          approvedDocument,
          currentStatus.id,
        )
      ) {
        return completeTransition(
          approvedDocument,
          transition,
          actor,
          `${idPrefix}-complete`,
        )
      }

      return {
        document: approvedDocument,
        result: 'approvalRecorded',
        message: 'Approval recorded; waiting for more approvals',
        emittedEffects: [],
      }
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
        onEmpty: () => [`${transition.label} has no execution roles`],
        onNonEmpty: () => [],
      }),
      ...Option.match(findStatus(workflow, transition.fromStatusId), {
        onNone: () => [`${transition.label} has a missing source status`],
        onSome: () => [],
      }),
      ...Option.match(findStatus(workflow, transition.toStatusId), {
        onNone: () => [`${transition.label} has a missing target status`],
        onSome: () => [],
      }),
    ]),
  )
  const approvalProblems = pipe(
    workflow.statuses,
    Array.flatMap(status => {
      if (status.type !== 'approval') {
        return status.approval === undefined
          ? []
          : [`${status.name} is not an approval status but has approval rules`]
      }

      if (status.approval === undefined) {
        return [`${status.name} is an approval status but has no approval rules`]
      }

      const outgoingTransitions = Array.filter(
        workflow.transitions,
        transition => transition.fromStatusId === status.id,
      )
      const outputProblems =
        outgoingTransitions.length === 2
          ? []
          : [`${status.name} approval status must have exactly two outputs`]
      const approvedProblems = Option.match(
        findTransition(workflow, status.approval.approvedTransitionId),
        {
          onNone: () => [`${status.name} approval status has a missing approved transition`],
          onSome: transition =>
            transition.fromStatusId === status.id
              ? []
              : [`${status.name} approved transition must start from itself`],
        },
      )
      const rejectedProblems = Option.match(
        findTransition(workflow, status.approval.rejectedTransitionId),
        {
          onNone: () => [`${status.name} approval status has a missing rejected transition`],
          onSome: transition =>
            transition.fromStatusId === status.id
              ? []
              : [`${status.name} rejected transition must start from itself`],
        },
      )
      const duplicateOutputProblems =
        status.approval.approvedTransitionId === status.approval.rejectedTransitionId
          ? [`${status.name} approval outputs must be distinct`]
          : []

      return [
        ...outputProblems,
        ...approvedProblems,
        ...rejectedProblems,
        ...duplicateOutputProblems,
      ]
    }),
  )

  return [...missingInitial, ...transitionProblems, ...approvalProblems]
}
