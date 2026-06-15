import { Array, Match as M, Option, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  DEFAULT_ACTORS,
  DEFAULT_DOCUMENTS,
  DEFAULT_NEXT_SEQUENCE,
  DEFAULT_WORKFLOW,
} from '../../constant'
import { Workflow } from '../../domain'
import * as MockBackend from '../../mockBackend'
import {
  LoadFlowDefinitions,
  PublishFlow,
  SaveFlowDraft,
  SaveWorkspace,
} from './command'
import { type Message } from './message'
import {
  GraphCanvasContextMenu,
  GraphContextMenuClosed,
  GraphNodeContextMenu,
  GraphPanIdle,
  GraphPanning,
  GraphTransitionContextMenu,
  type Model,
  TransitionDragIdle,
  TransitionDragging,
} from './model'

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

const selectedItemExists = (
  workflow: Workflow.WorkflowDefinition,
  selectedItemKind: Model['selectedItemKind'],
  selectedItemId: string,
): boolean => {
  if (selectedItemKind === 'Status') {
    return Option.isSome(Workflow.findStatus(workflow, selectedItemId))
  }
  if (selectedItemKind === 'Transition') {
    return Option.isSome(Workflow.findTransition(workflow, selectedItemId))
  }
  return true
}

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
    transitionDragState: TransitionDragIdle(),
    graphContextMenuState: GraphContextMenuClosed(),
    isActionMenuOpen: false,
    isPreviewSaved: false,
    isDirty: false,
    undoStack: [],
    selectedActorId: 'pedro',
    selectedDocumentId: 'req-1001',
    lastRequestJson: '',
    lastResponseJson: '',
    banner: '',
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

const toggleTransitionRole = (
  transition: Workflow.Transition,
  roleId: string,
): Workflow.Transition =>
  evo(transition, {
    allowedRoles: allowedRoles =>
      Array.contains(allowedRoles, roleId)
        ? Array.filter(allowedRoles, allowedRole => allowedRole !== roleId)
        : [...allowedRoles, roleId],
  })

const nextApprovalRuleMinAmount = (
  rules: ReadonlyArray<Workflow.ApprovalRule>,
): number =>
  Array.reduce(rules, 1, (nextMinAmount, rule) =>
    Math.max(nextMinAmount, rule.minAmount + 10000),
  )

const updateApprovalRule = (
  status: Workflow.Status,
  ruleId: string,
  f: (rule: Workflow.ApprovalRule) => Workflow.ApprovalRule,
): Workflow.Status =>
  evo(statusWithApprovalField(status), {
    approval: approval => {
      if (approval === undefined) {
        return undefined
      }

      return evo(approval, {
        rules: rules =>
          Array.map(rules, rule => (rule.id === ruleId ? f(rule) : rule)),
      })
    },
  })

const statusWithApprovalField = (status: Workflow.Status): Workflow.Status =>
  Workflow.Status.make({
    id: status.id,
    name: status.name,
    type: status.type,
    editPolicy: status.editPolicy,
    approval: status.approval,
  })

const approvalOutputTransitionIds = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
): { approvedTransitionId: string; rejectedTransitionId: string } => {
  const outgoingTransitions = Array.filter(
    workflow.transitions,
    transition => transition.fromStatusId === statusId,
  )

  return {
    approvedTransitionId: outgoingTransitions[0]?.id ?? '',
    rejectedTransitionId: outgoingTransitions[1]?.id ?? outgoingTransitions[0]?.id ?? '',
  }
}

const nextStatus = (model: Model): Workflow.Status => ({
  id: `status-${model.nextSequence}`,
  name: `New status ${model.nextSequence}`,
  type: 'normal',
  editPolicy: Workflow.unlockedEditPolicy,
  approval: undefined,
})

const nextTransition = (model: Model): Workflow.Transition => ({
  id: `transition-${model.nextSequence}`,
  fromStatusId: model.selectedStatusId,
  toStatusId: model.workflow.initialStatusId,
  label: `New transition ${model.nextSequence}`,
  allowedRoles: ['OrderModerator', 'SystemAdmin'],
  requiresComment: false,
  sortOrder: `z${model.nextSequence}`,
  effects: [],
})

const nextTransitionBetween = (
  model: Model,
  fromStatusId: string,
  toStatusId: string,
): Workflow.Transition => ({
  id: `transition-${model.nextSequence}`,
  fromStatusId,
  toStatusId,
  label: `New transition ${model.nextSequence}`,
  allowedRoles: ['OrderModerator', 'SystemAdmin'],
  requiresComment: false,
  sortOrder: `z${model.nextSequence}`,
  effects: [],
})

const canCreateTransitionFromStatus = (status: Workflow.Status): boolean =>
  status.type !== 'final'

const canCreateTransitionToStatus = (status: Workflow.Status): boolean =>
  status.type !== 'draft'

const canCreateTransitionBetween = (
  workflow: Workflow.WorkflowDefinition,
  fromStatusId: string,
  toStatusId: string,
): boolean => {
  if (fromStatusId === toStatusId) {
    return false
  }

  return Option.match(
    Option.all({
      from: Workflow.findStatus(workflow, fromStatusId),
      to: Workflow.findStatus(workflow, toStatusId),
    }),
    {
      onNone: () => false,
      onSome: ({ from, to }) =>
        canCreateTransitionFromStatus(from) && canCreateTransitionToStatus(to),
    },
  )
}

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

const saveAndRefresh = (
  model: Model,
  undoWorkflow?: Workflow.WorkflowDefinition,
): UpdateReturn =>
  withSavedWorkspace(
    evo(refreshExchange(model), {
      isPreviewSaved: () => false,
      isDirty: () => undoWorkflow !== undefined || model.undoStack.length > 0,
      undoStack: undoStack =>
        undoWorkflow === undefined ? undoStack : [...undoStack, undoWorkflow],
    }),
  )

const saveFlowChange = (nextModel: Model, previousModel: Model): UpdateReturn =>
  saveAndRefresh(nextModel, previousModel.workflow)

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedSelectedWorkflow: () => [
        evo(model, {
          selectedItemKind: () => 'Workflow',
          selectedItemId: () => '',
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
          transitionDragState: () => TransitionDragIdle(),
        }),
        [],
      ],

      ClickedToggledActionMenu: () => [
        evo(model, {
          isActionMenuOpen: value => !value,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [],
      ],

      ClickedSavedPreviewLocal: () => [
        evo(model, {
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
          isPreviewSaved: () => true,
          isDirty: () => false,
          undoStack: () => [],
        }),
        [workspaceCommand(model)],
      ],

      ClickedUndidFlowChanges: () => {
        const previousWorkflow = model.undoStack[model.undoStack.length - 1]

        if (previousWorkflow === undefined) {
          return [model, []]
        }

        const nextUndoStack = model.undoStack.slice(0, -1)

        return withSavedWorkspace(
          refreshExchange(
            evo(model, {
              workflow: () => previousWorkflow,
              selectedItemKind: selectedItemKind =>
                selectedItemExists(
                  previousWorkflow,
                  selectedItemKind,
                  model.selectedItemId,
                )
                  ? selectedItemKind
                  : 'Workflow',
              selectedItemId: selectedItemId =>
                selectedItemExists(
                  previousWorkflow,
                  model.selectedItemKind,
                  selectedItemId,
                )
                  ? selectedItemId
                  : '',
              isActionMenuOpen: () => false,
              graphContextMenuState: () => GraphContextMenuClosed(),
              isDirty: () => nextUndoStack.length > 0,
              isPreviewSaved: () => false,
              undoStack: () => nextUndoStack,
            }),
          ),
        )
      },

      SelectedStatus: ({ statusId }) => [
        evo(model, {
          selectedStatusId: () => statusId,
          selectedItemKind: () => 'Status',
          selectedItemId: () => statusId,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [],
      ],

      UpdatedStatusName: ({ statusId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, { name: () => value }),
              ),
            banner: () => 'Status name updated',
          }),
          model,
        ),

      SelectedStatusType: ({ statusId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(statusWithApprovalField(status), {
                  type: () => value,
                  approval: () => {
                    if (value !== 'approval') {
                      return undefined
                    }
                    if (status.approval !== undefined) {
                      return status.approval
                    }
                    const approvalOutputs = approvalOutputTransitionIds(
                      workflow,
                      statusId,
                    )
                    return {
                      allowSelfApproval: true,
                      approvedTransitionId: approvalOutputs.approvedTransitionId,
                      rejectedTransitionId: approvalOutputs.rejectedTransitionId,
                      rules: [
                        {
                          id: `rule-${model.nextSequence}`,
                          minAmount: 1,
                          roleId: 'OrderModerator',
                        },
                      ],
                    }
                  },
                }),
              ),
            nextSequence:
              value === 'approval' ? value => value + 1 : value => value,
            banner: () => 'Status behavior updated',
          }),
          model,
        ),

      ClickedToggledStatusLock: ({ statusId, field }) =>
        saveFlowChange(
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
          model,
        ),

      ClickedAddedStatus: () => {
        const status = nextStatus(model)
        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, {
                statuses: statuses => [...statuses, status],
              }),
            selectedStatusId: () => status.id,
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
            nextSequence: value => value + 1,
            banner: () => 'Status added',
          }),
          model,
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

        return saveFlowChange(
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
            graphContextMenuState: () => GraphContextMenuClosed(),
            banner: () => 'Status deleted. Connected transitions were removed.',
          }),
          model,
        )
      },

      SelectedTransition: ({ transitionId }) => [
        evo(model, {
          selectedTransitionId: () => transitionId,
          selectedItemKind: () => 'Transition',
          selectedItemId: () => transitionId,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [],
      ],

      UpdatedTransitionLabel: ({ transitionId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { label: () => value }),
              ),
            banner: () => 'Transition label updated',
          }),
          model,
        ),

      UpdatedTransitionSortOrder: ({ transitionId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { sortOrder: () => value }),
              ),
            banner: () => 'Transition sort order updated',
          }),
          model,
        ),

      ClickedToggledTransitionRole: ({ transitionId, roleId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                toggleTransitionRole(transition, roleId),
              ),
            banner: () => 'Transition execution roles updated',
          }),
          model,
        ),

      SelectedTransitionFromStatus: ({ transitionId, statusId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { fromStatusId: () => statusId }),
              ),
            banner: () => 'Transition source updated',
          }),
          model,
        ),

      SelectedTransitionToStatus: ({ transitionId, statusId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                evo(transition, { toStatusId: () => statusId }),
              ),
            banner: () => 'Transition target updated',
          }),
          model,
        ),

      ClickedToggledTransitionApproval: () => [
        evo(model, {
          banner: () => 'Approval is configured on approval statuses',
        }),
        [],
      ],

      ClickedAddedTransition: () => {
        const transition = nextTransition(model)
        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, {
                transitions: transitions => [...transitions, transition],
              }),
            selectedTransitionId: () => transition.id,
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
            nextSequence: value => value + 1,
            banner: () => 'Transition added',
          }),
          model,
        )
      },

      ClickedDeletedTransition: ({ transitionId }) => {
        const nextTransitions = Array.filter(
          model.workflow.transitions,
          transition => transition.id !== transitionId,
        )
        const nextSelectedTransitionId = Option.match(
          Array.head(nextTransitions),
          {
            onNone: () => '',
            onSome: transition => transition.id,
          },
        )

        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, { transitions: () => nextTransitions }),
            selectedTransitionId: () => nextSelectedTransitionId,
            selectedItemKind: selectedItemKind =>
              selectedItemKind === 'Transition' &&
              model.selectedItemId === transitionId
                ? 'Workflow'
                : selectedItemKind,
            selectedItemId: selectedItemId =>
              model.selectedItemKind === 'Transition' &&
              selectedItemId === transitionId
                ? ''
                : selectedItemId,
            graphContextMenuState: () => GraphContextMenuClosed(),
            banner: () => 'Transition deleted',
          }),
          model,
        )
      },

      ClickedAddedApprovalRule: ({ statusId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status => {
                const approvalOutputs = approvalOutputTransitionIds(
                  workflow,
                  statusId,
                )
                const approval = status.approval ?? {
                  allowSelfApproval: true,
                  approvedTransitionId: approvalOutputs.approvedTransitionId,
                  rejectedTransitionId: approvalOutputs.rejectedTransitionId,
                  rules: [],
                }
                const minAmount = nextApprovalRuleMinAmount(approval.rules)

                return evo(statusWithApprovalField(status), {
                  type: () => 'approval',
                  approval: () =>
                    evo(approval, {
                      rules: rules => [
                        ...rules,
                        {
                          id: `rule-${model.nextSequence}`,
                          minAmount,
                          roleId: 'OrderModerator',
                        },
                      ],
                    }),
                })
              }),
            nextSequence: value => value + 1,
            banner: () => 'Approval rule added',
          }),
          model,
        ),

      SelectedApprovalRuleRole: ({ statusId, ruleId, roleId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                updateApprovalRule(status, ruleId, rule =>
                  evo(rule, { roleId: () => roleId }),
                ),
              ),
            banner: () => 'Approval role updated',
          }),
          model,
        ),

      UpdatedApprovalRuleMinAmount: ({ statusId, ruleId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                updateApprovalRule(status, ruleId, rule =>
                  evo(rule, {
                    minAmount: minAmount => parseNumberInput(value, minAmount),
                  }),
                ),
              ),
            banner: () => 'Approval minimum amount updated',
          }),
          model,
        ),

      ClickedRemovedApprovalRule: ({ statusId, ruleId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(statusWithApprovalField(status), {
                  approval: approval => {
                    if (approval === undefined) {
                      return undefined
                    }

                    return evo(approval, {
                      rules: rules =>
                        Array.filter(rules, rule => rule.id !== ruleId),
                    })
                  },
                }),
              ),
            banner: () => 'Approval rule removed',
          }),
          model,
        ),

      ClickedAddedTransitionEffect: ({ transitionId, effectType }) =>
        saveFlowChange(
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
          model,
        ),

      ClickedRemovedTransitionEffect: ({ transitionId, effectId }) =>
        saveFlowChange(
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
          model,
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

      PressedGraphCanvas: ({ screenX, screenY }) => {
        if (model.transitionDragState._tag === 'TransitionDragging') {
          return [model, []]
        }

        return [
          evo(model, {
            graphPanState: () =>
              GraphPanning({
                startScreenX: screenX,
                startScreenY: screenY,
                startPanX: model.graphPanX,
                startPanY: model.graphPanY,
                didMove: false,
              }),
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          [],
        ]
      },

      PressedTransitionOutput: ({ statusId, screenX, screenY }) =>
        Option.match(Workflow.findStatus(model.workflow, statusId), {
          onNone: () => [model, []],
          onSome: status =>
            canCreateTransitionFromStatus(status)
              ? [
                  evo(model, {
                    transitionDragState: () =>
                      TransitionDragging({
                        fromStatusId: statusId,
                        startScreenX: screenX,
                        startScreenY: screenY,
                        currentScreenX: screenX,
                        currentScreenY: screenY,
                      }),
                    graphPanState: () => GraphPanIdle(),
                    isActionMenuOpen: () => false,
                    graphContextMenuState: () => GraphContextMenuClosed(),
                  }),
                  [],
                ]
              : [model, []],
        }),

      MovedGraphCanvasPointer: ({ screenX, screenY }) => {
        if (model.transitionDragState._tag === 'TransitionDragging') {
          return [
            evo(model, {
              transitionDragState: transitionDragState =>
                transitionDragState._tag === 'TransitionDragging'
                  ? evo(transitionDragState, {
                      currentScreenX: () => screenX,
                      currentScreenY: () => screenY,
                    })
                  : transitionDragState,
            }),
            [],
          ]
        }

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
            graphPanState: () => evo(graphPanState, { didMove: () => true }),
          }),
          [],
        ]
      },

      ReleasedGraphCanvasPointer: () => {
        if (model.transitionDragState._tag === 'TransitionDragging') {
          return [
            evo(model, { transitionDragState: () => TransitionDragIdle() }),
            [],
          ]
        }

        return [
          evo(model, {
            selectedItemKind: selectedItemKind =>
              model.graphPanState._tag === 'GraphPanning' &&
              !model.graphPanState.didMove
                ? 'Workflow'
                : selectedItemKind,
            selectedItemId: selectedItemId =>
              model.graphPanState._tag === 'GraphPanning' &&
              !model.graphPanState.didMove
                ? ''
                : selectedItemId,
            graphPanState: () => GraphPanIdle(),
          }),
          [],
        ]
      },

      ReleasedTransitionInput: ({ statusId }) => {
        if (model.transitionDragState._tag !== 'TransitionDragging') {
          return [model, []]
        }

        if (
          !canCreateTransitionBetween(
            model.workflow,
            model.transitionDragState.fromStatusId,
            statusId,
          )
        ) {
          return [
            evo(model, { transitionDragState: () => TransitionDragIdle() }),
            [],
          ]
        }

        const transition = nextTransitionBetween(
          model,
          model.transitionDragState.fromStatusId,
          statusId,
        )
        const nextModel = evo(model, {
          workflow: workflow =>
            evo(workflow, {
              transitions: transitions => [...transitions, transition],
            }),
          nextSequence: value => value + 1,
          selectedTransitionId: () => transition.id,
          transitionDragState: () => TransitionDragIdle(),
          graphPanState: () => GraphPanIdle(),
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
        })

        return saveFlowChange(nextModel, model)
      },

      PressedGraphCanvasContextMenu: ({ clientX, clientY }) => [
        evo(model, {
          graphContextMenuState: () =>
            GraphCanvasContextMenu({ clientX, clientY }),
          graphPanState: () => GraphPanIdle(),
          transitionDragState: () => TransitionDragIdle(),
          isActionMenuOpen: () => false,
        }),
        [],
      ],

      PressedGraphNodeContextMenu: ({ statusId, clientX, clientY }) =>
        Option.match(Workflow.findStatus(model.workflow, statusId), {
          onNone: () => [model, []],
          onSome: () => [
            evo(model, {
              graphContextMenuState: () =>
                GraphNodeContextMenu({ statusId, clientX, clientY }),
              graphPanState: () => GraphPanIdle(),
              transitionDragState: () => TransitionDragIdle(),
              isActionMenuOpen: () => false,
            }),
            [],
          ],
        }),

      PressedGraphTransitionContextMenu: ({ transitionId, clientX, clientY }) =>
        Option.match(Workflow.findTransition(model.workflow, transitionId), {
          onNone: () => [model, []],
          onSome: () => [
            evo(model, {
              graphContextMenuState: () =>
                GraphTransitionContextMenu({ transitionId, clientX, clientY }),
              graphPanState: () => GraphPanIdle(),
              transitionDragState: () => TransitionDragIdle(),
              isActionMenuOpen: () => false,
            }),
            [],
          ],
        }),

      SuppressedNativeGraphContextMenu: () => [model, []],

      ClickedClosedGraphContextMenu: () => [
        evo(model, { graphContextMenuState: () => GraphContextMenuClosed() }),
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

      ClickedLoadedRemoteFlowDefinitions: () => [
        evo(model, {
          banner: () => '',
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [LoadFlowDefinitions({ documentType: 'requisition' })],
      ],

      ClickedSavedRemoteFlowDraft: () => [
        evo(model, {
          banner: () => '',
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [
          SaveFlowDraft({
            flowId: model.workflow.id,
            workflow: model.workflow,
          }),
        ],
      ],

      ClickedPublishedRemoteFlow: () => [
        evo(model, {
          banner: () => '',
          isActionMenuOpen: () => false,
          graphContextMenuState: () => GraphContextMenuClosed(),
        }),
        [PublishFlow({ flowId: model.workflow.id, workflow: model.workflow })],
      ],

      CompletedSaveWorkspace: () => [model, []],

      SucceededLoadFlowDefinitions: ({ definitions }) => {
        const maybeDefinition = Array.head(definitions)

        return Option.match(maybeDefinition, {
          onNone: () => [
            evo(model, { banner: () => 'No remote flow definitions returned' }),
            [],
          ],
          onSome: workflow =>
            saveAndRefresh(
              evo(model, {
                workflow: () => workflow,
                selectedStatusId: () => workflow.initialStatusId,
                selectedTransitionId: () => workflow.transitions[0]?.id ?? '',
                selectedItemKind: () => 'Workflow',
                selectedItemId: () => '',
                isActionMenuOpen: () => false,
                graphContextMenuState: () => GraphContextMenuClosed(),
                isPreviewSaved: () => false,
                isDirty: () => false,
                undoStack: () => [],
                banner: () => '',
              }),
            ),
        })
      },

      FailedLoadFlowDefinitions: ({ error }) => [
        evo(model, { banner: () => `Failed to load flows: ${error}` }),
        [],
      ],

      SucceededSaveFlowDraft: ({ workflow }) =>
        withSavedWorkspace(
          refreshExchange(
            evo(model, {
              workflow: () => workflow,
              isPreviewSaved: () => true,
              isDirty: () => false,
              undoStack: () => [],
              banner: () => '',
            }),
          ),
        ),

      FailedSaveFlowDraft: ({ error }) => [
        evo(model, { banner: () => `Failed to save flow draft: ${error}` }),
        [],
      ],

      SucceededPublishFlow: ({ workflow }) =>
        withSavedWorkspace(
          refreshExchange(
            evo(model, {
              workflow: () => workflow,
              isPreviewSaved: () => false,
              isDirty: () => false,
              undoStack: () => [],
              banner: () => '',
            }),
          ),
        ),

      FailedPublishFlow: ({ error }) => [
        evo(model, { banner: () => `Failed to publish flow: ${error}` }),
        [],
      ],
    }),
  )

export { resetModel }
