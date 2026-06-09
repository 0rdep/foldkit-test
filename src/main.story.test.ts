import { describe, expect, test } from 'vitest'

import { Graph, Workflow } from './domain'
import { defaultModel } from './main'
import { CompletedSaveWorkspace } from './message'
import {
  ClickedDeletedStatus,
  ClickedRequestedTransition,
  ClickedResetGraphViewport,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  ReleasedGraphCanvasPointer,
  SelectedActor,
  SelectedDocumentStatus,
  UpdatedDocumentAmount,
} from './message'
import { update } from './update'

const documentStatus = (model: ReturnType<typeof defaultModel>): string =>
  model.workspace.documents[0]?.currentStatusId ?? ''

describe('workflow engine update', () => {
  test('submitting a draft moves the document into the first approval status', () => {
    const [nextModel, commands] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'submit-to-manager' }),
    )

    expect(documentStatus(nextModel)).toBe('waiting-manager-approval')
    expect(nextModel.workspace.documents[0]?.effectLog[0]?.type).toBe(
      'SendNotification',
    )
    expect(commands.length).toBe(1)
  })

  test('approval status blocks document edits', () => {
    const [nextModel] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'submit-to-manager' }),
    )
    const status = nextModel.workspace.workflow.statuses.find(
      item => item.id === nextModel.workspace.documents[0]?.currentStatusId,
    )

    expect(status?.editPolicy.addItems).toBe(false)
    expect(status?.editPolicy.changeDeliveryDate).toBe(false)
  })

  test('manager approval records approval and advances to finance review', () => {
    const [inApproval] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'submit-to-manager' }),
    )
    const [asManager] = update(inApproval, SelectedActor({ actorId: 'maria' }))
    const [nextModel] = update(
      asManager,
      ClickedRequestedTransition({ transitionId: 'manager-approves' }),
    )

    expect(documentStatus(nextModel)).toBe('finance-review')
    expect(
      nextModel.workspace.documents[0]?.eventLog.map(event => event.label),
    ).toContain('Maria Manager approved Manager approves')
  })

  test('high amount finance approval routes to director approval', () => {
    const [atFinance] = update(
      defaultModel(),
      SelectedDocumentStatus({
        documentId: 'req-1001',
        statusId: 'finance-review',
      }),
    )
    const [asFinance] = update(atFinance, SelectedActor({ actorId: 'ana' }))
    const [nextModel] = update(
      asFinance,
      ClickedRequestedTransition({ transitionId: 'finance-approves-high' }),
    )

    expect(documentStatus(nextModel)).toBe('director-approval')
  })

  test('standard amount finance approval can finish approval flow', () => {
    const [atFinance] = update(
      defaultModel(),
      SelectedDocumentStatus({
        documentId: 'req-1001',
        statusId: 'finance-review',
      }),
    )
    const [standardAmount] = update(
      atFinance,
      UpdatedDocumentAmount({ documentId: 'req-1001', value: '9000' }),
    )
    const [asFinance] = update(
      standardAmount,
      SelectedActor({ actorId: 'ana' }),
    )
    const [nextModel] = update(
      asFinance,
      ClickedRequestedTransition({
        transitionId: 'finance-approves-standard',
      }),
    )

    expect(documentStatus(nextModel)).toBe('approved')
  })

  test('completed save messages do not change model', () => {
    const model = defaultModel()
    const [nextModel, commands] = update(model, CompletedSaveWorkspace())

    expect(nextModel).toBe(model)
    expect(commands).toStrictEqual([])
  })

  test('dragging the graph viewport updates pan without saving workspace', () => {
    const [pressed] = update(
      defaultModel(),
      PressedGraphCanvas({ screenX: 100, screenY: 100 }),
    )
    const [moved, moveCommands] = update(
      pressed,
      MovedGraphCanvasPointer({ screenX: 160, screenY: 140 }),
    )
    const [released] = update(moved, ReleasedGraphCanvasPointer())

    expect(moved.workspace.graphPanX).toBe(60)
    expect(moved.workspace.graphPanY).toBe(40)
    expect(released.workspace.graphPanState._tag).toBe('GraphPanIdle')
    expect(moveCommands).toStrictEqual([])
  })

  test('zoom controls change and reset viewport scale', () => {
    const [zoomedIn] = update(defaultModel(), ClickedZoomedGraphIn())
    const [zoomedOut] = update(zoomedIn, ClickedZoomedGraphOut())
    const [reset] = update(zoomedOut, ClickedResetGraphViewport())

    expect(zoomedIn.workspace.graphZoom).toBeGreaterThan(1)
    expect(zoomedOut.workspace.graphZoom).toBeCloseTo(1)
    expect(reset.workspace.graphZoom).toBe(1)
    expect(reset.workspace.graphPanX).toBe(0)
    expect(reset.workspace.graphPanY).toBe(0)
  })

  test('deleting a status removes connected transitions and resets documents in that status', () => {
    const [waitingApproval] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'submit-to-manager' }),
    )
    const [nextModel, commands] = update(
      waitingApproval,
      ClickedDeletedStatus({ statusId: 'waiting-manager-approval' }),
    )

    expect(
      nextModel.workspace.workflow.statuses.map(status => status.id),
    ).not.toContain('waiting-manager-approval')
    expect(
      nextModel.workspace.workflow.transitions.some(
        transition =>
          transition.fromStatusId === 'waiting-manager-approval' ||
          transition.toStatusId === 'waiting-manager-approval',
      ),
    ).toBe(false)
    expect(documentStatus(nextModel)).toBe('draft')
    expect(nextModel.workspace.selectedItemKind).toBe('Workflow')
    expect(commands.length).toBe(1)
  })

  test('deleting the initial status is blocked', () => {
    const [nextModel, commands] = update(
      defaultModel(),
      ClickedDeletedStatus({ statusId: 'draft' }),
    )

    expect(nextModel.workspace.workflow.statuses.map(status => status.id)).toContain(
      'draft',
    )
    expect(nextModel.workspace.banner).toBe('Initial status cannot be deleted')
    expect(commands).toStrictEqual([])
  })

  test('multiple backward transitions to the same node use separate label lanes', () => {
    const model = defaultModel()
    const managerReturnTransition: Workflow.Transition = {
      id: 'manager-back-to-draft',
      fromStatusId: 'waiting-manager-approval',
      toStatusId: 'draft',
      label: 'Manager returns to draft',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [],
    }
    const financeReturnTransition: Workflow.Transition = {
      id: 'finance-back-to-draft',
      fromStatusId: 'finance-review',
      toStatusId: 'draft',
      label: 'Finance returns to draft',
      requiresApproval: false,
      approvalMode: 'all',
      approvalRules: [],
      effects: [],
    }
    const workflow = {
      ...model.workspace.workflow,
      transitions: [
        ...model.workspace.workflow.transitions,
        managerReturnTransition,
        financeReturnTransition,
      ],
    }
    const layout = Graph.layout(workflow)
    const managerBack = layout.edges.find(
      edge => edge.transition.id === 'manager-back-to-draft',
    )
    const financeBack = layout.edges.find(
      edge => edge.transition.id === 'finance-back-to-draft',
    )

    expect(managerBack?.labelY).not.toBe(financeBack?.labelY)
    expect(
      Math.abs((managerBack?.labelY ?? 0) - (financeBack?.labelY ?? 0)),
    ).toBeGreaterThan(40)
  })
})
