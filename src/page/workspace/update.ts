import { Array, Match as M, Option, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { SaveWorkspace } from './command'
import {
  DEFAULT_ACTORS,
  DEFAULT_DOCUMENTS,
  DEFAULT_NEXT_SEQUENCE,
  DEFAULT_WORKFLOW,
} from '../../constant'
import { Workflow } from '../../domain'
import { type Message } from './message'
import * as MockBackend from '../../mockBackend'
import { GraphPanIdle, GraphPanning, type Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const minGraphZoom = 0.45
const maxGraphZoom = 1.8
const graphZoomStep = 0.15

const parseNumberInput = (value: string, fallback: number): number => {
  const parsed = globalThis.Number(value)
  if (globalThis.Number.isFinite(parsed)) {
    return parsed
  }
  return fallback
}

const clampGraphZoom = (zoom: number): number =>
  Math.min(maxGraphZoom, Math.max(minGraphZoom, zoom))

const workspaceCommand = (model: Model): Command.Command<Message> =>
  SaveWorkspace({
    workflow: model.workflow,
    actors: model.actors,
    documents: model.documents,
    nextSequence: model.nextSequence,
  })

const withSavedWorkspace = (model: Model): UpdateReturn => [
  model,
  [workspaceCommand(model)],
]

const refreshExchange = (model: Model): Model => {
  const exchange = MockBackend.exchangeForSelection(
    model.workflow,
    model.actors,
    model.documents,
    model.selectedActorId,
    model.selectedDocumentId,
  )

  return evo(model, {
    lastRequestJson: () => MockBackend.formatRequest(exchange),
    lastResponseJson: () => MockBackend.formatResponse(exchange),
  })
}

const resetModel = (): Model =>
  refreshExchange({
    workflow: DEFAULT_WORKFLOW,
    actors: DEFAULT_ACTORS,
    documents: DEFAULT_DOCUMENTS,
    nextSequence: DEFAULT_NEXT_SEQUENCE,
    selectedStatusId: DEFAULT_WORKFLOW.initialStatusId,
    selectedTransitionId: 'submit-to-manager',
    selectedItemKind: 'Workflow',
    selectedItemId: '',
    graphPanX: 0,
    graphPanY: 0,
    graphZoom: 1,
    graphPanState: GraphPanIdle(),
    selectedActorId: 'pedro',
    selectedDocumentId: 'req-1001',
    lastRequestJson: '',
    lastResponseJson: '',
    banner: 'Workspace reset to the sample requisition flow',
  })

const updateSelectedDocument = (
  model: Model,
  documentId: string,
  f: (document: Workflow.DocumentInstance) => Workflow.DocumentInstance,
): Model =>
  evo(model, {
    documents: documents =>
      Array.map(documents, document =>
        document.id === documentId ? f(document) : document,
      ),
  })

const toggleEditPolicyField = (
  editPolicy: Workflow.EditPolicy,
  field: Workflow.LockField,
): Workflow.EditPolicy => {
  if (field === 'addItems') {
    return evo(editPolicy, { addItems: value => !value })
  }
  if (field === 'removeItems') {
    return evo(editPolicy, { removeItems: value => !value })
  }
  if (field === 'changeDeliveryDate') {
    return evo(editPolicy, { changeDeliveryDate: value => !value })
  }
  return evo(editPolicy, { changeAmount: value => !value })
}

const updateApprovalRule = (
  transition: Workflow.Transition,
  ruleId: string,
  f: (rule: Workflow.ApprovalRule) => Workflow.ApprovalRule,
): Workflow.Transition =>
  evo(transition, {
    approvalRules: rules =>
      Array.map(rules, rule => (rule.id === ruleId ? f(rule) : rule)),
  })

const addDefaultApprovalRule = (
  transition: Workflow.Transition,
  ruleId: string,
  roleId: string,
): Workflow.Transition =>
  evo(transition, {
    approvalRules: rules => [
      ...rules,
      {
        id: ruleId,
        roleId,
        minAmount: 0,
        maxAmount: 0,
        requiredCount: 1,
      },
    ],
  })

const selectedTransitionWithDefaultRule = (
  transition: Workflow.Transition,
  ruleId: string,
): Workflow.Transition => {
  if (
    !transition.requiresApproval &&
    Array.isReadonlyArrayEmpty(transition.approvalRules)
  ) {
    return addDefaultApprovalRule(
      evo(transition, { requiresApproval: () => true }),
      ruleId,
      'manager',
    )
  }

  return evo(transition, {
    requiresApproval: requiresApproval => !requiresApproval,
  })
}

const addTransitionEffect = (
  transition: Workflow.Transition,
  effectId: string,
  effectType: Workflow.EffectType,
): Workflow.Transition =>
  evo(transition, {
    effects: effects => [
      ...effects,
      {
        id: effectId,
        type: effectType,
        label: Workflow.effectTypeLabel(effectType),
      },
    ],
  })

const nextStatus = (model: Model): Workflow.Status => ({
  id: `status-${model.nextSequence}`,
  name: `New status ${model.nextSequence}`,
  type: 'normal',
  isTerminal: false,
  editPolicy: Workflow.unlockedEditPolicy,
})

const nextTransition = (model: Model): Workflow.Transition => ({
  id: `transition-${model.nextSequence}`,
  fromStatusId: model.selectedStatusId,
  toStatusId: model.workflow.initialStatusId,
  label: `New transition ${model.nextSequence}`,
  requiresApproval: false,
  approvalMode: 'all',
  approvalRules: [],
  effects: [],
})

const removeStatusFromWorkflow = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
): Workflow.WorkflowDefinition =>
  evo(workflow, {
    statuses: statuses =>
      Array.filter(statuses, status => status.id !== statusId),
    transitions: transitions =>
      Array.filter(
        transitions,
        transition =>
          transition.fromStatusId !== statusId &&
          transition.toStatusId !== statusId,
      ),
  })

const resetDocumentsInDeletedStatus = (
  documents: ReadonlyArray<Workflow.DocumentInstance>,
  statusId: string,
  initialStatusId: string,
): ReadonlyArray<Workflow.DocumentInstance> =>
  Array.map(documents, document => {
    if (document.currentStatusId !== statusId) {
      return document
    }

    return evo(document, {
      currentStatusId: () => initialStatusId,
      approvals: () => [],
    })
  })

const saveAndRefresh = (model: Model): UpdateReturn =>
  withSavedWorkspace(refreshExchange(model))

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedSelectedWorkflow: () => [
        evo(model, {
          selectedItemKind: () => 'Workflow',
          selectedItemId: () => '',
        }),
        [],
      ],

      SelectedStatus: ({ statusId }) => [
        evo(model, {
          selectedStatusId: () => statusId,
          selectedItemKind: () => 'Status',
          selectedItemId: () => statusId,
        }),
        [],
      ],

      UpdatedStatusName: ({ statusId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, { name: () => value }),
              ),
            banner: () => 'Status name updated',
          }),
        ),

      SelectedStatusType: ({ statusId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, {
                  type: () => value,
                  isTerminal: () => value === 'terminal',
                }),
              ),
            banner: () => 'Status behavior updated',
          }),
        ),

      ClickedToggledStatusLock: ({ statusId, field }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, {
                  editPolicy: editPolicy =>
                    toggleEditPolicyField(editPolicy, field),
                }),
              ),
            banner: () => 'Edit lock updated',
          }),
        ),

      ClickedAddedStatus: () => {
        const status = nextStatus(model)
        return saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              evo(workflow, {
                statuses: statuses => [...statuses, status],
              }),
            selectedStatusId: () => status.id,
            selectedItemKind: () => 'Status',
            selectedItemId: () => status.id,
            nextSequence: value => value + 1,
            banner: () => 'Status added',
          }),
        )
      },

      ClickedDeletedStatus: ({ statusId }) => {
        if (statusId === model.workflow.initialStatusId) {
          return [
            evo(model, { banner: () => 'Initial status cannot be deleted' }),
            [],
          ]
        }

        const nextWorkflow = removeStatusFromWorkflow(model.workflow, statusId)
        const nextSelectedTransitionId = Option.match(
          Array.head(nextWorkflow.transitions),
          {
            onNone: () => '',
            onSome: transition => transition.id,
          },
        )

        return saveAndRefresh(
          evo(model, {
            workflow: () => nextWorkflow,
            documents: documents =>
              resetDocumentsInDeletedStatus(
                documents,
                statusId,
                model.workflow.initialStatusId,
              ),
            selectedStatusId: () => model.workflow.initialStatusId,
            selectedTransitionId: () => nextSelectedTransitionId,
            selectedItemKind: () => 'Workflow',
            selectedItemId: () => '',
            banner: () => 'Status deleted. Connected transitions were removed.',
          }),
        )
      },

      SelectedTransition: ({ transitionId }) => [
        evo(model, {
          selectedTransitionId: () => transitionId,
          selectedItemKind: () => 'Transition',
          selectedItemId: () => transitionId,
        }),
        [],
      ],

      UpdatedTransitionLabel: ({ transitionId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { label: () => value }),
              ),
            banner: () => 'Transition label updated',
          }),
        ),

      SelectedTransitionFromStatus: ({ transitionId, statusId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { fromStatusId: () => statusId }),
              ),
            banner: () => 'Transition source updated',
          }),
        ),

      SelectedTransitionToStatus: ({ transitionId, statusId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { toStatusId: () => statusId }),
              ),
            banner: () => 'Transition target updated',
          }),
        ),

      ClickedToggledTransitionApproval: ({ transitionId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                selectedTransitionWithDefaultRule(
                  transition,
                  `rule-${model.nextSequence}`,
                ),
              ),
            nextSequence: value => value + 1,
            banner: () => 'Approval requirement updated',
          }),
        ),

      ClickedAddedTransition: () => {
        const transition = nextTransition(model)
        return saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              evo(workflow, {
                transitions: transitions => [...transitions, transition],
              }),
            selectedTransitionId: () => transition.id,
            selectedItemKind: () => 'Transition',
            selectedItemId: () => transition.id,
            nextSequence: value => value + 1,
            banner: () => 'Transition added',
          }),
        )
      },

      ClickedAddedApprovalRule: ({ transitionId, roleId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                addDefaultApprovalRule(
                  transition,
                  `rule-${model.nextSequence}`,
                  roleId,
                ),
              ),
            nextSequence: value => value + 1,
            banner: () => 'Approval rule added',
          }),
        ),

      SelectedApprovalRuleRole: ({ transitionId, ruleId, roleId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                updateApprovalRule(transition, ruleId, rule =>
                  evo(rule, { roleId: () => roleId }),
                ),
              ),
            banner: () => 'Approval role updated',
          }),
        ),

      UpdatedApprovalRuleMinAmount: ({ transitionId, ruleId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                updateApprovalRule(transition, ruleId, rule =>
                  evo(rule, {
                    minAmount: minAmount => parseNumberInput(value, minAmount),
                  }),
                ),
              ),
            banner: () => 'Approval amount updated',
          }),
        ),

      UpdatedApprovalRuleMaxAmount: ({ transitionId, ruleId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                updateApprovalRule(transition, ruleId, rule =>
                  evo(rule, {
                    maxAmount: maxAmount => parseNumberInput(value, maxAmount),
                  }),
                ),
              ),
            banner: () => 'Approval amount updated',
          }),
        ),

      UpdatedApprovalRuleRequiredCount: ({ transitionId, ruleId, value }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                updateApprovalRule(transition, ruleId, rule =>
                  evo(rule, {
                    requiredCount: requiredCount =>
                      Math.max(1, parseNumberInput(value, requiredCount)),
                  }),
                ),
              ),
            banner: () => 'Approval count updated',
          }),
        ),

      ClickedRemovedApprovalRule: ({ transitionId, ruleId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, {
                  approvalRules: rules =>
                    Array.filter(rules, rule => rule.id !== ruleId),
                }),
              ),
            banner: () => 'Approval rule removed',
          }),
        ),

      ClickedAddedTransitionEffect: ({ transitionId, effectType }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                addTransitionEffect(
                  transition,
                  `effect-${model.nextSequence}`,
                  effectType,
                ),
              ),
            nextSequence: value => value + 1,
            banner: () => 'Effect intent added',
          }),
        ),

      ClickedRemovedTransitionEffect: ({ transitionId, effectId }) =>
        saveAndRefresh(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, {
                  effects: effects =>
                    Array.filter(effects, effect => effect.id !== effectId),
                }),
              ),
            banner: () => 'Effect intent removed',
          }),
        ),

      SelectedActor: ({ actorId }) => [
        refreshExchange(evo(model, { selectedActorId: () => actorId })),
        [],
      ],

      SelectedDocument: ({ documentId }) => [
        refreshExchange(evo(model, { selectedDocumentId: () => documentId })),
        [],
      ],

      UpdatedDocumentAmount: ({ documentId, value }) =>
        saveAndRefresh(
          updateSelectedDocument(model, documentId, document =>
            evo(document, {
              amount: amount => parseNumberInput(value, amount),
              approvals: () => [],
            }),
          ),
        ),

      SelectedDocumentStatus: ({ documentId, statusId }) =>
        saveAndRefresh(
          updateSelectedDocument(model, documentId, document =>
            evo(document, {
              currentStatusId: () => statusId,
              approvals: () => [],
            }),
          ),
        ),

      ClickedRequestedTransition: ({ transitionId }) => {
        const maybeActor = Workflow.findActor(
          model.actors,
          model.selectedActorId,
        )
        const maybeDocument = Workflow.findDocument(
          model.documents,
          model.selectedDocumentId,
        )

        return pipe(
          Option.all({ actor: maybeActor, document: maybeDocument }),
          Option.match({
            onNone: () => [
              evo(model, { banner: () => 'Actor or document not found' }),
              [],
            ],
            onSome: ({ actor, document }) => {
              const idPrefix = `event-${model.nextSequence}`
              const { exchange, result } =
                MockBackend.requestDocumentTransition(
                  model.workflow,
                  document,
                  actor,
                  transitionId,
                  idPrefix,
                )
              const nextModel = evo(model, {
                documents: documents =>
                  Workflow.replaceDocument(documents, result.document),
                nextSequence: value => value + 1,
                lastRequestJson: () => MockBackend.formatRequest(exchange),
                lastResponseJson: () => MockBackend.formatResponse(exchange),
                banner: () => result.message,
              })
              return withSavedWorkspace(nextModel)
            },
          }),
        )
      },

      PressedGraphCanvas: ({ screenX, screenY }) => [
        evo(model, {
          selectedItemKind: () => 'Workflow',
          selectedItemId: () => '',
          graphPanState: () =>
            GraphPanning({
              startScreenX: screenX,
              startScreenY: screenY,
              startPanX: model.graphPanX,
              startPanY: model.graphPanY,
            }),
        }),
        [],
      ],

      MovedGraphCanvasPointer: ({ screenX, screenY }) => {
        if (model.graphPanState._tag !== 'GraphPanning') {
          return [model, []]
        }

        const graphPanState = model.graphPanState

        return [
          evo(model, {
            graphPanX: () =>
              graphPanState.startPanX + screenX - graphPanState.startScreenX,
            graphPanY: () =>
              graphPanState.startPanY + screenY - graphPanState.startScreenY,
          }),
          [],
        ]
      },

      ReleasedGraphCanvasPointer: () => [
        evo(model, { graphPanState: () => GraphPanIdle() }),
        [],
      ],

      ClickedZoomedGraphIn: () => [
        evo(model, {
          graphZoom: graphZoom => clampGraphZoom(graphZoom + graphZoomStep),
        }),
        [],
      ],

      ClickedZoomedGraphOut: () => [
        evo(model, {
          graphZoom: graphZoom => clampGraphZoom(graphZoom - graphZoomStep),
        }),
        [],
      ],

      ClickedResetGraphViewport: () => [
        evo(model, {
          graphPanX: () => 0,
          graphPanY: () => 0,
          graphZoom: () => 1,
          graphPanState: () => GraphPanIdle(),
        }),
        [],
      ],

      ClickedResetWorkspace: () => withSavedWorkspace(resetModel()),

      CompletedSaveWorkspace: () => [model, []],
    }),
  )

export { resetModel }
