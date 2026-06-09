import { Array, Option, Schema as S, String, pipe } from 'effect'
import { evo } from 'foldkit/struct'

export const StatusType = S.Literals([
  'draft',
  'normal',
  'approvalPending',
  'integration',
  'error',
  'terminal',
])
export type StatusType = typeof StatusType.Type

export const LockField = S.Literals([
  'addItems',
  'removeItems',
  'changeDeliveryDate',
  'changeAmount',
])
export type LockField = typeof LockField.Type

export const EditPolicy = S.Struct({
  addItems: S.Boolean,
  removeItems: S.Boolean,
  changeDeliveryDate: S.Boolean,
  changeAmount: S.Boolean,
})
export type EditPolicy = typeof EditPolicy.Type

export const Status = S.Struct({
  id: S.String,
  name: S.String,
  type: StatusType,
  isTerminal: S.Boolean,
  editPolicy: EditPolicy,
})
export type Status = typeof Status.Type

export const ApprovalMode = S.Literals(['all', 'any'])
export type ApprovalMode = typeof ApprovalMode.Type

export const ApprovalRule = S.Struct({
  id: S.String,
  roleId: S.String,
  minAmount: S.Number,
  maxAmount: S.Number,
  requiredCount: S.Number,
})
export type ApprovalRule = typeof ApprovalRule.Type

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
  requiresApproval: S.Boolean,
  approvalMode: ApprovalMode,
  approvalRules: S.Array(ApprovalRule),
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
  transitionId: S.String,
  ruleId: S.String,
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
  readonly requiresApproval: boolean
}

export type BlockedTransition = {
  readonly id: string
  readonly label: string
  readonly reason: string
}

export type PendingApproval = {
  readonly transitionId: string
  readonly transitionLabel: string
  readonly roleId: string
  readonly approvedCount: number
  readonly requiredCount: number
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

export const unlockedEditPolicy: EditPolicy = {
  addItems: true,
  removeItems: true,
  changeDeliveryDate: true,
  changeAmount: true,
}

export const lockedEditPolicy: EditPolicy = {
  addItems: false,
  removeItems: false,
  changeDeliveryDate: false,
  changeAmount: false,
}

export const approvalEditPolicy: EditPolicy = {
  addItems: false,
  removeItems: false,
  changeDeliveryDate: false,
  changeAmount: false,
}

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
  if (statusType === 'approvalPending') {
    return 'Approval pending'
  }
  if (statusType === 'integration') {
    return 'Integration'
  }
  if (statusType === 'terminal') {
    return 'Terminal'
  }
  if (statusType === 'error') {
    return 'Error'
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

const isAmountInRule = (amount: number, rule: ApprovalRule): boolean =>
  amount >= rule.minAmount && (rule.maxAmount <= 0 || amount <= rule.maxAmount)

const actorHasRole = (actor: Actor, roleId: string): boolean =>
  Array.contains(actor.roleIds, roleId)

const matchingRules = (
  transition: Transition,
  amount: number,
): ReadonlyArray<ApprovalRule> =>
  Array.filter(transition.approvalRules, rule => isAmountInRule(amount, rule))

const approvalsForTransition = (
  document: DocumentInstance,
  transitionId: string,
): ReadonlyArray<ApprovalRecord> =>
  Array.filter(
    document.approvals,
    approval => approval.transitionId === transitionId,
  )

const approvalsForRule = (
  approvals: ReadonlyArray<ApprovalRecord>,
  ruleId: string,
): ReadonlyArray<ApprovalRecord> =>
  Array.filter(approvals, approval => approval.ruleId === ruleId)

const amountRangeLabel = (rule: ApprovalRule): string => {
  if (rule.maxAmount <= 0) {
    return `from ${rule.minAmount}`
  }
  return `${rule.minAmount} to ${rule.maxAmount}`
}

const canActorApproveRule = (actor: Actor, rule: ApprovalRule): boolean =>
  actorHasRole(actor, rule.roleId)

const alreadyApproved = (
  document: DocumentInstance,
  transitionId: string,
  actorId: string,
): boolean =>
  pipe(
    approvalsForTransition(document, transitionId),
    Array.some(approval => approval.actorId === actorId),
  )

const isTransitionApprovalComplete = (
  transition: Transition,
  rules: ReadonlyArray<ApprovalRule>,
  approvals: ReadonlyArray<ApprovalRecord>,
): boolean => {
  if (Array.isReadonlyArrayEmpty(rules)) {
    return false
  }

  if (transition.approvalMode === 'any') {
    return pipe(
      rules,
      Array.some(
        rule =>
          approvalsForRule(approvals, rule.id).length >= rule.requiredCount,
      ),
    )
  }

  return pipe(
    rules,
    Array.every(
      rule => approvalsForRule(approvals, rule.id).length >= rule.requiredCount,
    ),
  )
}

export const pendingApprovalsForDocument = (
  workflow: WorkflowDefinition,
  document: DocumentInstance,
): ReadonlyArray<PendingApproval> =>
  pipe(
    workflow.transitions,
    Array.filter(
      transition =>
        transition.fromStatusId === document.currentStatusId &&
        transition.requiresApproval,
    ),
    Array.flatMap(transition => {
      const rules = matchingRules(transition, document.amount)
      const approvals = approvalsForTransition(document, transition.id)
      return Array.map(rules, rule => ({
        transitionId: transition.id,
        transitionLabel: transition.label,
        roleId: rule.roleId,
        approvedCount: approvalsForRule(approvals, rule.id).length,
        requiredCount: rule.requiredCount,
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
    type: 'error',
    isTerminal: false,
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
      const maybeToStatus = findStatus(workflow, transition.toStatusId)
      const toStatusName = Option.match(maybeToStatus, {
        onNone: () => transition.toStatusId,
        onSome: status => status.name,
      })

      if (!transition.requiresApproval) {
        return [
          {
            id: transition.id,
            label: transition.label,
            toStatusName,
            requiresApproval: false,
          },
        ]
      }

      const rules = matchingRules(transition, document.amount)
      const canApprove = pipe(
        rules,
        Array.some(rule => canActorApproveRule(actor, rule)),
      )

      if (!canApprove || alreadyApproved(document, transition.id, actor.id)) {
        return []
      }

      return [
        {
          id: transition.id,
          label: transition.label,
          toStatusName,
          requiresApproval: true,
        },
      ]
    }),
  )

  const blockedTransitions = pipe(
    outgoingTransitions,
    Array.flatMap(transition => {
      if (!transition.requiresApproval) {
        return []
      }

      const rules = matchingRules(transition, document.amount)
      if (Array.isReadonlyArrayEmpty(rules)) {
        return [
          {
            id: transition.id,
            label: transition.label,
            reason: 'No approval rule matches this amount',
          },
        ]
      }

      if (alreadyApproved(document, transition.id, actor.id)) {
        return [
          {
            id: transition.id,
            label: transition.label,
            reason: 'This actor already approved this transition',
          },
        ]
      }

      const requiredRoles = pipe(
        rules,
        Array.map(rule => roleLabel(rule.roleId)),
        Array.join(', '),
      )

      const canApprove = pipe(
        rules,
        Array.some(rule => canActorApproveRule(actor, rule)),
      )

      if (!canApprove) {
        return [
          {
            id: transition.id,
            label: transition.label,
            reason: `Requires ${requiredRoles}`,
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
          approval => approval.transitionId !== transition.id,
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

      if (!transition.requiresApproval) {
        return completeTransition(document, transition, actor, idPrefix)
      }

      const rules = matchingRules(transition, document.amount)
      const maybeRule = pipe(
        rules,
        Array.findFirst(rule => canActorApproveRule(actor, rule)),
      )

      if (Array.isReadonlyArrayEmpty(rules)) {
        return {
          document,
          result: 'blocked',
          message: 'No approval rule matches this amount',
          emittedEffects: [],
        }
      }

      if (alreadyApproved(document, transition.id, actor.id)) {
        return {
          document,
          result: 'blocked',
          message: 'This actor already approved this transition',
          emittedEffects: [],
        }
      }

      return Option.match(maybeRule, {
        onNone: () => ({
          document,
          result: 'blocked',
          message: 'Actor cannot approve this transition',
          emittedEffects: [],
        }),
        onSome: rule => {
          const nextApproval: ApprovalRecord = {
            id: `${idPrefix}-approval`,
            transitionId: transition.id,
            ruleId: rule.id,
            actorId: actor.id,
            roleId: rule.roleId,
          }
          const approvals = [...document.approvals, nextApproval]
          const isComplete = isTransitionApprovalComplete(
            transition,
            rules,
            approvalsForTransition(
              evo(document, { approvals: () => approvals }),
              transition.id,
            ),
          )

          const approvedDocument = appendEvent(
            evo(document, { approvals: () => approvals }),
            idPrefix,
            `${actor.name} approved ${transition.label}`,
          )

          if (isComplete) {
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
      ...Option.match(findStatus(workflow, transition.fromStatusId), {
        onNone: () => [`${transition.label} has a missing source status`],
        onSome: () => [],
      }),
      ...Option.match(findStatus(workflow, transition.toStatusId), {
        onNone: () => [`${transition.label} has a missing target status`],
        onSome: () => [],
      }),
      ...(transition.requiresApproval &&
      Array.isReadonlyArrayEmpty(transition.approvalRules)
        ? [`${transition.label} requires approval but has no rules`]
        : []),
    ]),
  )

  return [...missingInitial, ...transitionProblems]
}
