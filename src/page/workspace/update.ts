import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  DEFAULT_ACTORS,
  DEFAULT_DOCUMENTS,
  DEFAULT_NEXT_SEQUENCE,
  DEFAULT_WORKFLOW,
} from '../../constant'
import { defaultWorkflowForDocumentType } from '../../default-flow-definitions'
import { Workflow } from '../../domain'
import * as MockBackend from '../../mockBackend'
import {
  CopyWorkflowExportJson,
  LoadFlowDefinitions,
  LoadFlowHistory,
  PublishFlow,
  SaveFlowDraft,
  SaveWorkspace,
} from './command'
import { type Message } from './message'
import {
  type FlowDocumentType,
  GraphCanvasContextMenu,
  GraphContextMenuClosed,
  GraphNodeContextMenu,
  GraphPanIdle,
  GraphPanning,
  GraphTransitionContextMenu,
  type Model,
  type PendingOperation,
  TransitionDragIdle,
  TransitionDragging,
  WorkflowExportJsonModalOpen,
  WorkflowImportJsonModalOpen,
  WorkflowJsonModalClosed,
  formatWorkflowExportJson,
} from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const minGraphZoom = 0.45
const maxGraphZoom = 1.8
const graphZoomStep = 0.15
const commandResultMessageTags: ReadonlyArray<string> = [
  'CompletedSaveWorkspace',
  'SucceededLoadFlowDefinitions',
  'FailedLoadFlowDefinitions',
  'SucceededLoadCompanies',
  'FailedLoadCompanies',
  'SucceededLoadFlowHistory',
  'FailedLoadFlowHistory',
  'SucceededSaveFlowDraft',
  'FailedSaveFlowDraft',
  'SucceededPublishFlow',
  'FailedPublishFlow',
  'SucceededCopyWorkflowExportJson',
  'FailedCopyWorkflowExportJson',
]

export const isLoading = (model: Model): boolean =>
  !Array.isReadonlyArrayEmpty(model.pendingOperations)

export const canProcessWhileLoading = (message: Message): boolean =>
  Array.contains(commandResultMessageTags, message._tag)

export const addPendingOperation = (
  model: Model,
  operation: PendingOperation,
): Model =>
  evo(model, {
    pendingOperations: pendingOperations =>
      Array.contains(pendingOperations, operation)
        ? pendingOperations
        : [...pendingOperations, operation],
  })

const removePendingOperation = (
  model: Model,
  operation: PendingOperation,
): Model =>
  evo(model, {
    pendingOperations: pendingOperations =>
      Array.filter(
        pendingOperations,
        pendingOperation => pendingOperation !== operation,
      ),
  })

const parseNumberInput = (value: string, fallback: number): number => {
  const parsed = globalThis.Number(value)
  if (globalThis.Number.isFinite(parsed)) {
    return parsed
  }
  return fallback
}

const clampGraphZoom = (zoom: number): number =>
  Math.min(maxGraphZoom, Math.max(minGraphZoom, zoom))

const editableActionKey = (
  statusId: string,
  action: Workflow.EditableAction,
): string => `${statusId}:${action}`

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

const sameFlowVersion = (
  left: Workflow.WorkflowDefinition,
  right: Workflow.WorkflowDefinition,
): boolean => left.id === right.id && left.version === right.version

const sortedFlowHistory = (
  definitions: ReadonlyArray<Workflow.WorkflowDefinition>,
): ReadonlyArray<Workflow.WorkflowDefinition> =>
  [...definitions].sort((left, right) => right.version - left.version)

const upsertFlowHistory = (
  history: ReadonlyArray<Workflow.WorkflowDefinition>,
  workflow: Workflow.WorkflowDefinition,
): ReadonlyArray<Workflow.WorkflowDefinition> =>
  sortedFlowHistory([
    workflow,
    ...Array.filter(
      history,
      definition => !sameFlowVersion(definition, workflow),
    ),
  ])

const currentHistory = (
  workflow: Workflow.WorkflowDefinition,
  definitions: ReadonlyArray<Workflow.WorkflowDefinition>,
): ReadonlyArray<Workflow.WorkflowDefinition> =>
  upsertFlowHistory(definitions, workflow)

const targetCompanyIdVariable = (model: Model): string | undefined => {
  const companyId = model.targetCompanyId.trim()

  return companyId === '' ? undefined : companyId
}

const targetCompanyIdValueVariable = (value: string): string | undefined => {
  const companyId = value.trim()

  return companyId === '' ? undefined : companyId
}

const flowDocumentTypeFromWorkflow = (
  workflow: Workflow.WorkflowDefinition,
): FlowDocumentType =>
  workflow.documentType.toLowerCase() === 'order' ? 'order' : 'requisition'

const historyDefinitionMatches = (
  definition: Workflow.WorkflowDefinition,
  flowId: string,
  version: number,
): boolean => definition.id === flowId && definition.version === version

const workflowFromHistory = (
  currentWorkflow: Workflow.WorkflowDefinition,
  historyWorkflow: Workflow.WorkflowDefinition,
): Workflow.WorkflowDefinition =>
  evo(historyWorkflow, {
    id: () => currentWorkflow.id,
    version: () => currentWorkflow.version,
    state: () => currentWorkflow.state,
  })

const workflowFromExportJson = (
  value: string,
): Option.Option<Workflow.WorkflowDefinition> => {
  try {
    return Option.some(
      S.decodeUnknownSync(Workflow.WorkflowDefinition)(JSON.parse(value)),
    )
  } catch {
    return Option.none()
  }
}

const applyWorkflowContents = (
  model: Model,
  sourceWorkflow: Workflow.WorkflowDefinition,
  banner: string,
): UpdateReturn => {
  const nextWorkflow = workflowFromHistory(model.workflow, sourceWorkflow)

  return saveFlowChange(
    evo(model, {
      workflow: () => nextWorkflow,
      selectedStatusId: selectedStatusId =>
        Option.isSome(Workflow.findStatus(nextWorkflow, selectedStatusId))
          ? selectedStatusId
          : nextWorkflow.initialStatusId,
      selectedTransitionId: selectedTransitionId =>
        Option.isSome(
          Workflow.findTransition(nextWorkflow, selectedTransitionId),
        )
          ? selectedTransitionId
          : (nextWorkflow.transitions[0]?.id ?? ''),
      selectedFlowDocumentType: () =>
        flowDocumentTypeFromWorkflow(nextWorkflow),
      selectedItemKind: selectedItemKind =>
        selectedItemExists(nextWorkflow, selectedItemKind, model.selectedItemId)
          ? selectedItemKind
          : 'Workflow',
      selectedItemId: selectedItemId =>
        selectedItemExists(nextWorkflow, model.selectedItemKind, selectedItemId)
          ? selectedItemId
          : '',
      isActionMenuOpen: () => false,
      graphContextMenuState: () => GraphContextMenuClosed(),
      workflowJsonModalState: () => WorkflowJsonModalClosed(),
      banner: () => banner,
    }),
    model,
  )
}

const workspaceCommand = (model: Model): Command.Command<Message> =>
  SaveWorkspace({
    workflow: model.workflow,
    flowHistory: model.flowHistory,
    targetCompanyId: model.targetCompanyId,
    selectedFlowDocumentType: model.selectedFlowDocumentType,
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
    flowHistory: [DEFAULT_WORKFLOW],
    targetCompanyId: '',
    selectedFlowDocumentType: 'requisition',
    companies: [],
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
    workflowJsonModalState: WorkflowJsonModalClosed(),
    isActionMenuOpen: false,
    isPreviewSaved: false,
    isDirty: false,
    undoStack: [],
    openEditableActionKeys: [],
    selectedActorId: 'pedro',
    selectedDocumentId: 'req-1001',
    lastRequestJson: '',
    lastResponseJson: '',
    banner: '',
    pendingOperations: [],
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

const toggleEditableActionRole = (
  editPolicy: Workflow.EditPolicy,
  action: Workflow.EditableAction,
  roleId: string,
): Workflow.EditPolicy => {
  const roles = Workflow.rolesForEditableAction(editPolicy, action)

  if (!Array.contains(roles, roleId)) {
    const nextDefinition = Workflow.editableAction(action, [...roles, roleId])
    return Array.some(editPolicy, definition => definition.action === action)
      ? Array.map(editPolicy, definition =>
          definition.action === action ? nextDefinition : definition,
        )
      : [...editPolicy, nextDefinition]
  }

  const nextRoles = Array.filter(roles, allowedRole => allowedRole !== roleId)
  if (Array.isReadonlyArrayEmpty(nextRoles)) {
    return Array.filter(editPolicy, definition => definition.action !== action)
  }

  return Array.map(editPolicy, definition =>
    definition.action === action
      ? Workflow.editableAction(action, nextRoles)
      : definition,
  )
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

const setTransitionAutomationOnly = (
  transition: Workflow.Transition,
  value: boolean,
): Workflow.Transition =>
  Workflow.Transition.make({
    id: transition.id,
    fromStatusId: transition.fromStatusId,
    toStatusId: transition.toStatusId,
    allowedRoles: value ? [] : transition.allowedRoles,
    automationOnly: value,
    effects: transition.effects,
  })

const moveTransition = (
  transitions: ReadonlyArray<Workflow.Transition>,
  transitionId: string,
  offset: number,
): ReadonlyArray<Workflow.Transition> => {
  const index = transitions.findIndex(
    transition => transition.id === transitionId,
  )
  const targetIndex = index + offset

  if (index < 0 || targetIndex < 0 || targetIndex >= transitions.length) {
    return transitions
  }

  const transition = transitions[index]
  const targetTransition = transitions[targetIndex]

  if (transition === undefined || targetTransition === undefined) {
    return transitions
  }

  return Array.map(transitions, (currentTransition, currentIndex) => {
    if (currentIndex === index) {
      return targetTransition
    }
    if (currentIndex === targetIndex) {
      return transition
    }
    return currentTransition
  })
}

const nextStatus = (model: Model): Workflow.Status => ({
  id: `status-${model.nextSequence}`,
  name: `New status ${model.nextSequence}`,
  type: 'normal',
  editPolicy: Workflow.unlockedEditPolicy,
})

const nextTransition = (model: Model): Workflow.Transition => ({
  id: `transition-${model.nextSequence}`,
  fromStatusId: model.selectedStatusId,
  toStatusId: model.workflow.initialStatusId,
  allowedRoles: ['OrderModerator', 'SystemAdmin'],
  automationOnly: false,
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
  allowedRoles: ['OrderModerator', 'SystemAdmin'],
  automationOnly: false,
  effects: [],
})

const preferredStatusId = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
): string =>
  Option.isSome(Workflow.findStatus(workflow, statusId))
    ? statusId
    : (workflow.statuses[0]?.id ?? '')

const defaultDeliveryAutomation = (
  workflow: Workflow.WorkflowDefinition,
): Workflow.DeliveryAutomation => ({
  enabled: true,
  fullyDeliveredStatusId: preferredStatusId(workflow, 'DELIVERED'),
  partiallyDeliveredStatusId: preferredStatusId(
    workflow,
    'PARTIALLY_DELIVERED',
  ),
  partiallyDeliveredCompletionRequiredStatusId: preferredStatusId(
    workflow,
    'PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
  ),
})

const updateDeliveryAutomation = (
  workflow: Workflow.WorkflowDefinition,
  f: (automation: Workflow.DeliveryAutomation) => Workflow.DeliveryAutomation,
): Workflow.WorkflowDefinition =>
  evo(workflow, {
    deliveryAutomation: automation =>
      f(automation ?? defaultDeliveryAutomation(workflow)),
  })

const setDeliveryAutomationStatus = (
  automation: Workflow.DeliveryAutomation,
  field:
    | 'fullyDeliveredStatusId'
    | 'partiallyDeliveredStatusId'
    | 'partiallyDeliveredCompletionRequiredStatusId',
  statusId: string,
): Workflow.DeliveryAutomation => {
  if (field === 'fullyDeliveredStatusId') {
    return evo(automation, { fullyDeliveredStatusId: () => statusId })
  }
  if (field === 'partiallyDeliveredStatusId') {
    return evo(automation, { partiallyDeliveredStatusId: () => statusId })
  }
  return evo(automation, {
    partiallyDeliveredCompletionRequiredStatusId: () => statusId,
  })
}

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

  if (
    Array.some(
      workflow.transitions,
      transition =>
        transition.fromStatusId === fromStatusId &&
        transition.toStatusId === toStatusId,
    )
  ) {
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

const canUpdateTransitionBetween = (
  workflow: Workflow.WorkflowDefinition,
  transitionId: string,
  fromStatusId: string,
  toStatusId: string,
): boolean => {
  if (fromStatusId === toStatusId) {
    return false
  }

  if (
    Array.some(
      workflow.transitions,
      transition =>
        transition.id !== transitionId &&
        transition.fromStatusId === fromStatusId &&
        transition.toStatusId === toStatusId,
    )
  ) {
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

const updateStatusIdInWorkflow = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
  nextStatusId: string,
): Workflow.WorkflowDefinition =>
  evo(workflow, {
    initialStatusId: initialStatusId =>
      initialStatusId === statusId ? nextStatusId : initialStatusId,
    statuses: statuses =>
      Array.map(statuses, status =>
        status.id === statusId
          ? evo(status, { id: () => nextStatusId })
          : status,
      ),
    transitions: transitions =>
      Array.map(transitions, transition =>
        evo(transition, {
          fromStatusId: fromStatusId =>
            fromStatusId === statusId ? nextStatusId : fromStatusId,
          toStatusId: toStatusId =>
            toStatusId === statusId ? nextStatusId : toStatusId,
        }),
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

export const update = (model: Model, message: Message): UpdateReturn => {
  if (isLoading(model) && !canProcessWhileLoading(message)) {
    return [model, []]
  }

  return M.value(message).pipe(
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

      UpdatedTargetCompanyId: ({ value }) => {
        const nextModel = addPendingOperation(
          evo(model, {
            targetCompanyId: () => value,
            flowHistory: () => [],
            banner: () => '',
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          'loadFlowDefinitions',
        )

        return [
          nextModel,
          [
            workspaceCommand(nextModel),
            LoadFlowDefinitions({
              documentType: nextModel.selectedFlowDocumentType,
              companyId: targetCompanyIdValueVariable(value),
            }),
          ],
        ]
      },

      UpdatedFlowDocumentType: ({ value }) => {
        const nextModel = addPendingOperation(
          evo(model, {
            banner: () => '',
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          'loadFlowDefinitions',
        )

        return [
          nextModel,
          [
            LoadFlowDefinitions({
              documentType: value,
              companyId: targetCompanyIdVariable(model),
            }),
          ],
        ]
      },

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

      UpdatedStatusId: ({ statusId, value }) => {
        const nextStatusId = value.trim()
        if (nextStatusId === '' || nextStatusId === statusId) {
          return [model, []]
        }

        if (
          Array.some(
            model.workflow.statuses,
            status => status.id === nextStatusId,
          )
        ) {
          return [evo(model, { banner: () => 'Status id already exists' }), []]
        }

        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              updateStatusIdInWorkflow(workflow, statusId, nextStatusId),
            documents: documents =>
              Array.map(documents, document =>
                document.currentStatusId === statusId
                  ? evo(document, { currentStatusId: () => nextStatusId })
                  : document,
              ),
            selectedStatusId: selectedStatusId =>
              selectedStatusId === statusId ? nextStatusId : selectedStatusId,
            selectedItemId: selectedItemId =>
              selectedItemId === statusId ? nextStatusId : selectedItemId,
            banner: () => 'Status id updated',
          }),
          model,
        )
      },

      SelectedStatusType: ({ statusId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, {
                  type: () => value,
                }),
              ),
            banner: () => 'Status behavior updated',
          }),
          model,
        ),

      ClickedToggledStatusActionDisclosure: ({ statusId, action }) => {
        const key = editableActionKey(statusId, action)
        return [
          evo(model, {
            openEditableActionKeys: keys =>
              Array.contains(keys, key)
                ? Array.filter(keys, currentKey => currentKey !== key)
                : [...keys, key],
          }),
          [],
        ]
      },

      ClickedToggledStatusActionRole: ({ statusId, action, roleId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateStatus(workflow, statusId, status =>
                evo(status, {
                  editPolicy: editPolicy =>
                    toggleEditableActionRole(editPolicy, action, roleId),
                }),
              ),
            banner: () => 'Editable action roles updated',
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

      UpdatedTransitionAutomationOnly: ({ transitionId, value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              Workflow.updateTransition(workflow, transitionId, transition =>
                setTransitionAutomationOnly(transition, value),
              ),
            banner: () => 'Transition automation setting updated',
          }),
          model,
        ),

      ClickedMovedTransitionEarlier: ({ transitionId }) => {
        const nextTransitions = moveTransition(
          model.workflow.transitions,
          transitionId,
          -1,
        )

        if (nextTransitions === model.workflow.transitions) {
          return [model, []]
        }

        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, { transitions: () => nextTransitions }),
            banner: () => 'Transition moved earlier',
          }),
          model,
        )
      },

      ClickedMovedTransitionLater: ({ transitionId }) => {
        const nextTransitions = moveTransition(
          model.workflow.transitions,
          transitionId,
          1,
        )

        if (nextTransitions === model.workflow.transitions) {
          return [model, []]
        }

        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, { transitions: () => nextTransitions }),
            banner: () => 'Transition moved later',
          }),
          model,
        )
      },

      SelectedTransitionFromStatus: ({ transitionId, statusId }) =>
        Option.match(Workflow.findTransition(model.workflow, transitionId), {
          onNone: () => [model, []],
          onSome: transition =>
            canUpdateTransitionBetween(
              model.workflow,
              transitionId,
              statusId,
              transition.toStatusId,
            )
              ? saveFlowChange(
                  evo(model, {
                    workflow: workflow =>
                      Workflow.updateTransition(
                        workflow,
                        transitionId,
                        transition =>
                          evo(transition, { fromStatusId: () => statusId }),
                      ),
                    banner: () => 'Transition source updated',
                  }),
                  model,
                )
              : [
                  evo(model, {
                    banner: () => 'Transition source is not valid',
                  }),
                  [],
                ],
        }),

      SelectedTransitionToStatus: ({ transitionId, statusId }) =>
        Option.match(Workflow.findTransition(model.workflow, transitionId), {
          onNone: () => [model, []],
          onSome: transition =>
            canUpdateTransitionBetween(
              model.workflow,
              transitionId,
              transition.fromStatusId,
              statusId,
            )
              ? saveFlowChange(
                  evo(model, {
                    workflow: workflow =>
                      Workflow.updateTransition(
                        workflow,
                        transitionId,
                        transition =>
                          evo(transition, { toStatusId: () => statusId }),
                      ),
                    banner: () => 'Transition target updated',
                  }),
                  model,
                )
              : [
                  evo(model, {
                    banner: () => 'Transition target is not valid',
                  }),
                  [],
                ],
        }),

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

      ClickedAddedDeliveryAutomation: () => {
        if (model.selectedFlowDocumentType !== 'order') {
          return [
            evo(model, {
              banner: () => 'Delivery automation is available for order flows',
            }),
            [],
          ]
        }

        if (model.workflow.deliveryAutomation !== undefined) {
          return [
            evo(model, { banner: () => 'Delivery automation already exists' }),
            [],
          ]
        }

        return saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, {
                deliveryAutomation: () => defaultDeliveryAutomation(workflow),
              }),
            banner: () => 'Delivery automation added',
          }),
          model,
        )
      },

      ClickedRemovedDeliveryAutomation: () =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              evo(workflow, { deliveryAutomation: () => undefined }),
            banner: () => 'Delivery automation removed',
          }),
          model,
        ),

      UpdatedDeliveryAutomationEnabled: ({ value }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              updateDeliveryAutomation(workflow, automation =>
                evo(automation, { enabled: () => value }),
              ),
            banner: () => 'Delivery automation updated',
          }),
          model,
        ),

      SelectedDeliveryAutomationStatus: ({ field, statusId }) =>
        saveFlowChange(
          evo(model, {
            workflow: workflow =>
              updateDeliveryAutomation(workflow, automation =>
                setDeliveryAutomationStatus(automation, field, statusId),
              ),
            banner: () => 'Delivery automation updated',
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
            }),
          ),
        ),

      SelectedDocumentStatus: ({ documentId, statusId }) =>
        saveAndRefresh(
          updateSelectedDocument(model, documentId, document =>
            evo(document, {
              currentStatusId: () => statusId,
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
          onSome: status => {
            return canCreateTransitionFromStatus(status)
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
              : [model, []]
          },
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

        const transitionDragState = model.transitionDragState

        if (
          !canCreateTransitionBetween(
            model.workflow,
            transitionDragState.fromStatusId,
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
          transitionDragState.fromStatusId,
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

      ClickedOpenedWorkflowExportModal: () => [
        evo(model, {
          workflowJsonModalState: () => WorkflowExportJsonModalOpen(),
          graphContextMenuState: () => GraphContextMenuClosed(),
          banner: () => '',
        }),
        [],
      ],

      ClickedOpenedWorkflowImportModal: () => [
        evo(model, {
          workflowJsonModalState: () =>
            WorkflowImportJsonModalOpen({ value: '' }),
          graphContextMenuState: () => GraphContextMenuClosed(),
          banner: () => '',
        }),
        [],
      ],

      ClickedClosedWorkflowJsonModal: () => [
        evo(model, {
          workflowJsonModalState: () => WorkflowJsonModalClosed(),
          banner: () => '',
        }),
        [],
      ],

      ClickedCopiedWorkflowExportJson: () => [
        evo(model, { banner: () => '' }),
        [
          CopyWorkflowExportJson({
            value: formatWorkflowExportJson(model.workflow),
          }),
        ],
      ],

      UpdatedWorkflowImportJson: ({ value }) => {
        if (
          model.workflowJsonModalState._tag !== 'WorkflowImportJsonModalOpen'
        ) {
          return [model, []]
        }

        return [
          evo(model, {
            workflowJsonModalState: () =>
              WorkflowImportJsonModalOpen({ value }),
            banner: () => '',
          }),
          [],
        ]
      },

      SubmittedWorkflowImportJson: () => {
        if (
          model.workflowJsonModalState._tag !== 'WorkflowImportJsonModalOpen'
        ) {
          return [model, []]
        }

        return pipe(
          workflowFromExportJson(model.workflowJsonModalState.value),
          Option.match({
            onNone: () => [
              evo(model, {
                banner: () =>
                  'Import failed. Paste workflow JSON exported from this app.',
              }),
              [],
            ],
            onSome: workflow =>
              applyWorkflowContents(model, workflow, 'Workflow JSON imported'),
          }),
        )
      },

      ClickedAppliedDefaultFlow: () =>
        applyWorkflowContents(
          model,
          defaultWorkflowForDocumentType(model.selectedFlowDocumentType),
          'Default flow restored',
        ),

      ClickedLoadedRemoteFlowDefinitions: () => [
        addPendingOperation(
          evo(model, {
            banner: () => '',
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          'loadFlowDefinitions',
        ),
        [
          LoadFlowDefinitions({
            documentType: model.selectedFlowDocumentType,
            companyId: targetCompanyIdVariable(model),
          }),
        ],
      ],

      ClickedRevertedFlowVersion: ({ flowId, version }) =>
        pipe(
          Array.findFirst(model.flowHistory, definition =>
            historyDefinitionMatches(definition, flowId, version),
          ),
          Option.match({
            onNone: () => [
              evo(model, { banner: () => 'Flow version not found in history' }),
              [],
            ],
            onSome: historyWorkflow =>
              applyWorkflowContents(
                model,
                historyWorkflow,
                `Reverted draft contents to version ${historyWorkflow.version}`,
              ),
          }),
        ),

      ClickedSavedRemoteFlowDraft: () => [
        addPendingOperation(
          evo(model, {
            banner: () => '',
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          'saveFlowDraft',
        ),
        [
          SaveFlowDraft({
            flowId: model.workflow.id,
            workflow: model.workflow,
            companyId: targetCompanyIdVariable(model),
          }),
        ],
      ],

      ClickedPublishedRemoteFlow: () => [
        addPendingOperation(
          evo(model, {
            banner: () => '',
            isActionMenuOpen: () => false,
            graphContextMenuState: () => GraphContextMenuClosed(),
          }),
          'publishFlow',
        ),
        [
          PublishFlow({
            flowId: model.workflow.id,
            workflow: model.workflow,
            companyId: targetCompanyIdVariable(model),
          }),
        ],
      ],

      CompletedSaveWorkspace: () => [model, []],

      SucceededCopyWorkflowExportJson: () => [
        evo(model, { banner: () => 'Workflow JSON copied to clipboard' }),
        [],
      ],

      FailedCopyWorkflowExportJson: () => [
        evo(model, { banner: () => 'Failed to copy workflow JSON' }),
        [],
      ],

      SucceededLoadFlowDefinitions: ({ definitions }) => {
        const maybeDefinition = Array.head(definitions)
        const baseModel = removePendingOperation(model, 'loadFlowDefinitions')

        return Option.match(maybeDefinition, {
          onNone: () => [
            evo(baseModel, {
              banner: () => 'No remote flow definitions returned',
            }),
            [],
          ],
          onSome: workflow => {
            const nextModel = addPendingOperation(
              refreshExchange(
                evo(baseModel, {
                  workflow: () => workflow,
                  flowHistory: () => currentHistory(workflow, definitions),
                  selectedFlowDocumentType: () =>
                    flowDocumentTypeFromWorkflow(workflow),
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
              'loadFlowHistory',
            )

            return [
              nextModel,
              [
                workspaceCommand(nextModel),
                LoadFlowHistory({
                  flowId: workflow.id,
                  companyId: targetCompanyIdVariable(model),
                }),
              ],
            ]
          },
        })
      },

      FailedLoadFlowDefinitions: ({ error }) => [
        evo(removePendingOperation(model, 'loadFlowDefinitions'), {
          banner: () => `Failed to load flows: ${error}`,
        }),
        [],
      ],

      SucceededLoadCompanies: ({ companies }) => {
        const baseModel = removePendingOperation(model, 'loadCompanies')
        const selectedCompanyExists = Array.some(
          companies,
          company => `${company.id}` === baseModel.targetCompanyId,
        )
        const selectedCompanyId = selectedCompanyExists
          ? baseModel.targetCompanyId
          : `${companies[0]?.id ?? ''}`
        const nextModel = evo(baseModel, {
          companies: () => companies,
          targetCompanyId: () => selectedCompanyId,
          flowHistory: flowHistory =>
            selectedCompanyId === baseModel.targetCompanyId ? flowHistory : [],
        })

        if (
          selectedCompanyId === '' ||
          selectedCompanyId === baseModel.targetCompanyId
        ) {
          return [nextModel, []]
        }

        const loadingModel = addPendingOperation(
          nextModel,
          'loadFlowDefinitions',
        )

        return [
          loadingModel,
          [
            workspaceCommand(loadingModel),
            LoadFlowDefinitions({
              documentType: loadingModel.selectedFlowDocumentType,
              companyId: selectedCompanyId,
            }),
          ],
        ]
      },

      FailedLoadCompanies: ({ error }) => [
        evo(removePendingOperation(model, 'loadCompanies'), {
          banner: () => `Failed to load companies: ${error}`,
        }),
        [],
      ],

      SucceededLoadFlowHistory: ({ definitions }) => [
        evo(removePendingOperation(model, 'loadFlowHistory'), {
          flowHistory: () => currentHistory(model.workflow, definitions),
        }),
        [],
      ],

      FailedLoadFlowHistory: ({ error }) => [
        evo(removePendingOperation(model, 'loadFlowHistory'), {
          banner: () => `Failed to load flow history: ${error}`,
        }),
        [],
      ],

      SucceededSaveFlowDraft: ({ workflow }) => {
        const nextModel = addPendingOperation(
          refreshExchange(
            evo(removePendingOperation(model, 'saveFlowDraft'), {
              workflow: () => workflow,
              flowHistory: flowHistory =>
                upsertFlowHistory(flowHistory, workflow),
              isPreviewSaved: () => true,
              isDirty: () => false,
              undoStack: () => [],
              banner: () => '',
            }),
          ),
          'loadFlowHistory',
        )

        return [
          nextModel,
          [
            workspaceCommand(nextModel),
            LoadFlowHistory({
              flowId: workflow.id,
              companyId: targetCompanyIdVariable(model),
            }),
          ],
        ]
      },

      FailedSaveFlowDraft: ({ error }) => [
        evo(removePendingOperation(model, 'saveFlowDraft'), {
          banner: () => `Failed to save flow draft: ${error}`,
        }),
        [],
      ],

      SucceededPublishFlow: ({ workflow }) => {
        const nextModel = addPendingOperation(
          refreshExchange(
            evo(removePendingOperation(model, 'publishFlow'), {
              workflow: () => workflow,
              flowHistory: flowHistory =>
                upsertFlowHistory(flowHistory, workflow),
              isPreviewSaved: () => false,
              isDirty: () => false,
              undoStack: () => [],
              banner: () => '',
            }),
          ),
          'loadFlowHistory',
        )

        return [
          nextModel,
          [
            workspaceCommand(nextModel),
            LoadFlowHistory({
              flowId: workflow.id,
              companyId: targetCompanyIdVariable(model),
            }),
          ],
        ]
      },

      FailedPublishFlow: ({ error }) => [
        evo(removePendingOperation(model, 'publishFlow'), {
          banner: () => `Failed to publish flow: ${error}`,
        }),
        [],
      ],
    }),
  )
}

export { resetModel }
