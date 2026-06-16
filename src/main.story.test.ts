import { describe, expect, test } from 'vitest'

import { DEFAULT_WORKFLOW } from './constant'
import { Graph, Workflow } from './domain'
import { defaultModel } from './main'
import { CompletedSaveWorkspace } from './message'
import {
  ClickedAppliedDefaultFlow,
  ClickedDeletedStatus,
  ClickedRequestedTransition,
  ClickedResetGraphViewport,
  ClickedRevertedFlowVersion,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  PressedTransitionOutput,
  ReleasedGraphCanvasPointer,
  ReleasedTransitionInput,
  SelectedActor,
  SelectedStatus,
  SucceededLoadFlowHistory,
} from './message'
import { update } from './update'

const documentStatus = (model: ReturnType<typeof defaultModel>): string =>
  model.workspace.documents[0]?.currentStatusId ?? ''

const graphStatus = (
  id: string,
  name: string,
  type: Workflow.StatusType = 'normal',
): Workflow.Status => ({
  id,
  name,
  type,
  editPolicy: Workflow.unlockedEditPolicy,
})

const graphTransition = (
  id: string,
  fromStatusId: string,
  toStatusId: string,
): Workflow.Transition => ({
  id,
  fromStatusId,
  toStatusId,
  label: id,
  allowedRoles: [],
  requiresComment: false,
  sortOrder: id,
  effects: [],
})

const nodeCenterY = (node: Graph.GraphNode | undefined): number =>
  node === undefined ? 0 : node.y + node.height / 2

type TestPoint = Readonly<{ x: number; y: number }>
type TestRect = Readonly<{
  left: number
  top: number
  right: number
  bottom: number
}>

const cubicPointAt = (
  from: TestPoint,
  controlA: TestPoint,
  controlB: TestPoint,
  to: TestPoint,
  t: number,
): TestPoint => {
  const inverse = 1 - t
  const a = inverse * inverse * inverse
  const b = 3 * inverse * inverse * t
  const c = 3 * inverse * t * t
  const d = t * t * t

  return {
    x: a * from.x + b * controlA.x + c * controlB.x + d * to.x,
    y: a * from.y + b * controlA.y + c * controlB.y + d * to.y,
  }
}

const pathSamplePoints = (path: string): ReadonlyArray<TestPoint> => {
  const tokens = path.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? []
  const start = { x: Number(tokens[1] ?? 0), y: Number(tokens[2] ?? 0) }
  const build = (
    index: number,
    current: TestPoint,
    result: ReadonlyArray<TestPoint>,
  ): ReadonlyArray<TestPoint> => {
    if (index >= tokens.length) {
      return result
    }

    const command = tokens[index]

    if (command !== 'C') {
      return result
    }

    const controlA = {
      x: Number(tokens[index + 1] ?? 0),
      y: Number(tokens[index + 2] ?? 0),
    }
    const controlB = {
      x: Number(tokens[index + 3] ?? 0),
      y: Number(tokens[index + 4] ?? 0),
    }
    const next = {
      x: Number(tokens[index + 5] ?? 0),
      y: Number(tokens[index + 6] ?? 0),
    }
    const samples = globalThis.Array.from({ length: 20 }, (_, sampleIndex) =>
      cubicPointAt(current, controlA, controlB, next, (sampleIndex + 1) / 21),
    )

    return build(index + 7, next, [...result, ...samples])
  }

  return build(3, start, [])
}

const nodeRect = (node: Graph.GraphNode): TestRect => ({
  left: node.x,
  top: node.y,
  right: node.x + node.width,
  bottom: node.y + node.height,
})

const pointInsideRect = (point: TestPoint, rect: TestRect): boolean =>
  point.x > rect.left &&
  point.x < rect.right &&
  point.y > rect.top &&
  point.y < rect.bottom

describe('workflow engine update', () => {
  test('submitting a draft moves the document into the next normal status', () => {
    const [nextModel, commands] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'draft-to-pending-approval' }),
    )

    expect(documentStatus(nextModel)).toBe('PENDING_APPROVAL')
    expect(nextModel.workspace.documents[0]?.effectLog[0]?.type).toBe(
      'SendNotification',
    )
    expect(commands.length).toBe(1)
  })

  test('normal status uses its configured edit policy', () => {
    const [nextModel] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'draft-to-pending-approval' }),
    )
    const status = nextModel.workspace.workflow.statuses.find(
      item => item.id === nextModel.workspace.documents[0]?.currentStatusId,
    )

    const editPolicy = status?.editPolicy ?? Workflow.lockedEditPolicy
    expect(
      Workflow.canRoleEditAction(editPolicy, 'items', 'OrderCreator'),
    ).toBe(true)
    expect(
      Workflow.canRoleEditAction(editPolicy, 'deliveryDate', 'OrderCreator'),
    ).toBe(true)
  })

  test('manager transition advances to approved', () => {
    const [pending] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'draft-to-pending-approval' }),
    )
    const [asManager] = update(pending, SelectedActor({ actorId: 'maria' }))
    const [nextModel] = update(
      asManager,
      ClickedRequestedTransition({
        transitionId: 'pending-approval-to-approved',
      }),
    )

    expect(documentStatus(nextModel)).toBe('APPROVED')
    expect(
      nextModel.workspace.documents[0]?.eventLog.map(event => event.label),
    ).toContain('Maria Manager completed Approve')
  })

  test('completed save messages do not change model', () => {
    const model = defaultModel()
    const [nextModel, commands] = update(model, CompletedSaveWorkspace())

    expect(nextModel).toBe(model)
    expect(commands).toStrictEqual([])
  })

  test('reverting a historical flow version keeps the active draft identity', () => {
    const model = defaultModel()
    const currentWorkflow: Workflow.WorkflowDefinition = {
      ...model.workspace.workflow,
      id: 'flow-1',
      version: 2,
      state: 'draft',
    }
    const previousWorkflow: Workflow.WorkflowDefinition = {
      ...currentWorkflow,
      version: 1,
      state: 'published',
      statuses: currentWorkflow.statuses.map(status =>
        status.id === 'DRAFT' ? { ...status, name: 'Old Draft' } : status,
      ),
    }
    const [withHistory] = update(
      { workspace: { ...model.workspace, workflow: currentWorkflow } },
      SucceededLoadFlowHistory({ definitions: [previousWorkflow] }),
    )
    const [reverted, commands] = update(
      withHistory,
      ClickedRevertedFlowVersion({ flowId: 'flow-1', version: 1 }),
    )

    expect(reverted.workspace.workflow.id).toBe('flow-1')
    expect(reverted.workspace.workflow.version).toBe(2)
    expect(reverted.workspace.workflow.state).toBe('draft')
    expect(
      reverted.workspace.workflow.statuses.find(status => status.id === 'DRAFT')
        ?.name,
    ).toBe('Old Draft')
    expect(reverted.workspace.isDirty).toBe(true)
    expect(commands.length).toBe(1)
  })

  test('applying the default flow keeps the active draft identity', () => {
    const model = defaultModel()
    const currentWorkflow: Workflow.WorkflowDefinition = {
      ...model.workspace.workflow,
      id: 'flow-1',
      name: 'Custom draft',
      version: 2,
      state: 'draft',
      initialStatusId: 'CUSTOM',
      statuses: [graphStatus('CUSTOM', 'Custom status', 'draft')],
      transitions: [],
    }
    const [applied, commands] = update(
      {
        workspace: {
          ...model.workspace,
          workflow: currentWorkflow,
          selectedStatusId: 'CUSTOM',
          selectedItemKind: 'Status',
          selectedItemId: 'CUSTOM',
        },
      },
      ClickedAppliedDefaultFlow(),
    )

    expect(applied.workspace.workflow.id).toBe('flow-1')
    expect(applied.workspace.workflow.version).toBe(2)
    expect(applied.workspace.workflow.state).toBe('draft')
    expect(applied.workspace.workflow.initialStatusId).toBe(
      DEFAULT_WORKFLOW.initialStatusId,
    )
    expect(
      applied.workspace.workflow.statuses.map(status => status.id),
    ).toEqual(DEFAULT_WORKFLOW.statuses.map(status => status.id))
    expect(applied.workspace.selectedStatusId).toBe(
      DEFAULT_WORKFLOW.initialStatusId,
    )
    expect(applied.workspace.isDirty).toBe(true)
    expect(commands.length).toBe(1)
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

  test('dragging the graph viewport keeps the selected inspector open', () => {
    const [selected] = update(
      defaultModel(),
      SelectedStatus({ statusId: 'PENDING_APPROVAL' }),
    )
    const [pressed] = update(
      selected,
      PressedGraphCanvas({ screenX: 100, screenY: 100 }),
    )
    const [moved] = update(
      pressed,
      MovedGraphCanvasPointer({ screenX: 140, screenY: 130 }),
    )
    const [released] = update(moved, ReleasedGraphCanvasPointer())

    expect(released.workspace.selectedItemKind).toBe('Status')
    expect(released.workspace.selectedItemId).toBe('PENDING_APPROVAL')
  })

  test('dragging from an output handle to an input handle creates a transition', () => {
    const model = defaultModel()
    const [dragging] = update(
      model,
      PressedTransitionOutput({
        statusId: 'APPROVED',
        screenX: 100,
        screenY: 100,
      }),
    )
    const [nextModel, commands] = update(
      dragging,
      ReleasedTransitionInput({ statusId: 'REJECTED' }),
    )
    const transition = nextModel.workspace.workflow.transitions.find(
      item => item.id === `transition-${model.workspace.nextSequence}`,
    )

    expect(dragging.workspace.transitionDragState._tag).toBe(
      'TransitionDragging',
    )
    expect(transition?.fromStatusId).toBe('APPROVED')
    expect(transition?.toStatusId).toBe('REJECTED')
    expect(nextModel.workspace.selectedTransitionId).toBe(transition?.id)
    expect(nextModel.workspace.selectedItemKind).toBe(
      model.workspace.selectedItemKind,
    )
    expect(nextModel.workspace.selectedItemId).toBe(
      model.workspace.selectedItemId,
    )
    expect(nextModel.workspace.transitionDragState._tag).toBe(
      'TransitionDragIdle',
    )
    expect(commands.length).toBe(1)
  })

  test('transition drag blocks final outputs and draft inputs', () => {
    const [fromFinal, finalCommands] = update(
      defaultModel(),
      PressedTransitionOutput({
        statusId: 'CANCELLED',
        screenX: 100,
        screenY: 100,
      }),
    )
    const [dragging] = update(
      defaultModel(),
      PressedTransitionOutput({
        statusId: 'PENDING_APPROVAL',
        screenX: 100,
        screenY: 100,
      }),
    )
    const [toDraft, draftCommands] = update(
      dragging,
      ReleasedTransitionInput({ statusId: 'DRAFT' }),
    )

    expect(fromFinal.workspace.transitionDragState._tag).toBe(
      'TransitionDragIdle',
    )
    expect(finalCommands).toStrictEqual([])
    expect(toDraft.workspace.transitionDragState._tag).toBe(
      'TransitionDragIdle',
    )
    expect(toDraft.workspace.workflow.transitions.length).toBe(
      defaultModel().workspace.workflow.transitions.length,
    )
    expect(draftCommands).toStrictEqual([])
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

  test('balances two outgoing graph nodes around the source row', () => {
    const layout = Graph.layout(defaultModel().workspace.workflow)
    const draft = layout.nodes.find(node => node.status.id === 'DRAFT')
    const pending = layout.nodes.find(
      node => node.status.id === 'PENDING_APPROVAL',
    )
    const approved = layout.nodes.find(node => node.status.id === 'APPROVED')
    const upperDelta = nodeCenterY(draft) - nodeCenterY(pending)
    const lowerDelta = nodeCenterY(approved) - nodeCenterY(draft)

    expect(upperDelta).toBeCloseTo(lowerDelta)
    expect(upperDelta).toBeGreaterThan(40)
    expect(upperDelta).toBeLessThan(160)
  })

  test('keeps the middle of three outgoing graph nodes on the source row', () => {
    const workflow: Workflow.WorkflowDefinition = {
      id: 'balanced-three-output-flow',
      name: 'Balanced three output flow',
      documentType: 'Test',
      version: 1,
      initialStatusId: 'SOURCE',
      statuses: [
        graphStatus('SOURCE', 'Source', 'draft'),
        graphStatus('UPPER', 'Upper'),
        graphStatus('MIDDLE', 'Middle'),
        graphStatus('LOWER', 'Lower'),
      ],
      transitions: [
        graphTransition('source-to-upper', 'SOURCE', 'UPPER'),
        graphTransition('source-to-middle', 'SOURCE', 'MIDDLE'),
        graphTransition('source-to-lower', 'SOURCE', 'LOWER'),
      ],
    }
    const layout = Graph.layout(workflow)
    const source = layout.nodes.find(node => node.status.id === 'SOURCE')
    const upper = layout.nodes.find(node => node.status.id === 'UPPER')
    const middle = layout.nodes.find(node => node.status.id === 'MIDDLE')
    const lower = layout.nodes.find(node => node.status.id === 'LOWER')
    const upperDelta = nodeCenterY(source) - nodeCenterY(upper)
    const lowerDelta = nodeCenterY(lower) - nodeCenterY(source)

    expect(nodeCenterY(middle)).toBeCloseTo(nodeCenterY(source))
    expect(upperDelta).toBeCloseTo(lowerDelta)
    expect(upperDelta).toBeGreaterThan(180)
    expect(upperDelta).toBeLessThan(240)
  })

  test('normalizes balanced rows into the graph canvas', () => {
    const workflow: Workflow.WorkflowDefinition = {
      id: 'balanced-four-output-flow',
      name: 'Balanced four output flow',
      documentType: 'Test',
      version: 1,
      initialStatusId: 'SOURCE',
      statuses: [
        graphStatus('SOURCE', 'Source', 'draft'),
        graphStatus('A', 'A'),
        graphStatus('B', 'B'),
        graphStatus('C', 'C'),
        graphStatus('D', 'D'),
      ],
      transitions: [
        graphTransition('source-to-a', 'SOURCE', 'A'),
        graphTransition('source-to-b', 'SOURCE', 'B'),
        graphTransition('source-to-c', 'SOURCE', 'C'),
        graphTransition('source-to-d', 'SOURCE', 'D'),
      ],
    }
    const layout = Graph.layout(workflow)
    const minY = Math.min(...layout.nodes.map(node => node.y))

    expect(minY).toBeGreaterThanOrEqual(0)
  })

  test('uses bezier graph edge paths', () => {
    const layout = Graph.layout(defaultModel().workspace.workflow)

    expect(layout.edges.every(edge => /C/.test(edge.path))).toBe(true)
    expect(layout.edges.every(edge => !/[HVQ]/.test(edge.path))).toBe(true)
  })

  test('routes graph edge curves outside node bodies', () => {
    const layout = Graph.layout(defaultModel().workspace.workflow)
    const intersections = layout.edges.flatMap(edge =>
      pathSamplePoints(edge.path).flatMap(point =>
        layout.nodes
          .filter(
            node =>
              node.status.id !== edge.from.status.id &&
              node.status.id !== edge.to.status.id,
          )
          .filter(node => pointInsideRect(point, nodeRect(node)))
          .map(node => `${edge.transition.id}:${node.status.id}`),
      ),
    )

    expect(intersections).toStrictEqual([])
  })

  test('routes long graph edges around intermediate nodes', () => {
    const workflow: Workflow.WorkflowDefinition = {
      id: 'blocked-long-edge-flow',
      name: 'Blocked long edge flow',
      documentType: 'Test',
      version: 1,
      initialStatusId: 'SOURCE',
      statuses: [
        graphStatus('SOURCE', 'Source', 'draft'),
        graphStatus('BLOCKER', 'Blocker'),
        graphStatus('TARGET', 'Target'),
      ],
      transitions: [
        graphTransition('source-to-blocker', 'SOURCE', 'BLOCKER'),
        graphTransition('blocker-to-target', 'BLOCKER', 'TARGET'),
        graphTransition('source-to-target', 'SOURCE', 'TARGET'),
      ],
    }
    const layout = Graph.layout(workflow)
    const longEdge = layout.edges.find(
      edge => edge.transition.id === 'source-to-target',
    )
    const blocker = layout.nodes.find(node => node.status.id === 'BLOCKER')
    const blockerHits = pathSamplePoints(longEdge?.path ?? '').filter(
      sample =>
        blocker !== undefined && pointInsideRect(sample, nodeRect(blocker)),
    )

    expect(blockerHits).toStrictEqual([])
  })

  test('routes backward graph edges around intermediate nodes', () => {
    const workflow: Workflow.WorkflowDefinition = {
      id: 'blocked-back-edge-flow',
      name: 'Blocked back edge flow',
      documentType: 'Test',
      version: 1,
      initialStatusId: 'SOURCE',
      statuses: [
        graphStatus('SOURCE', 'Source', 'draft'),
        graphStatus('BLOCKER', 'Blocker'),
        graphStatus('TARGET', 'Target'),
      ],
      transitions: [
        graphTransition('source-to-blocker', 'SOURCE', 'BLOCKER'),
        graphTransition('blocker-to-target', 'BLOCKER', 'TARGET'),
        graphTransition('target-to-source', 'TARGET', 'SOURCE'),
      ],
    }
    const layout = Graph.layout(workflow)
    const backEdge = layout.edges.find(
      edge => edge.transition.id === 'target-to-source',
    )
    const blocker = layout.nodes.find(node => node.status.id === 'BLOCKER')
    const blockerHits = pathSamplePoints(backEdge?.path ?? '').filter(
      sample =>
        blocker !== undefined && pointInsideRect(sample, nodeRect(blocker)),
    )

    expect(blockerHits).toStrictEqual([])
  })

  test('separates parallel graph transitions between the same nodes', () => {
    const workflow: Workflow.WorkflowDefinition = {
      id: 'parallel-edge-flow',
      name: 'Parallel edge flow',
      documentType: 'Test',
      version: 1,
      initialStatusId: 'SOURCE',
      statuses: [
        graphStatus('SOURCE', 'Source', 'draft'),
        graphStatus('TARGET', 'Target'),
      ],
      transitions: [
        graphTransition('source-to-target-primary', 'SOURCE', 'TARGET'),
        graphTransition('source-to-target-secondary', 'SOURCE', 'TARGET'),
      ],
    }
    const layout = Graph.layout(workflow)
    const primary = layout.edges.find(
      edge => edge.transition.id === 'source-to-target-primary',
    )
    const secondary = layout.edges.find(
      edge => edge.transition.id === 'source-to-target-secondary',
    )
    const primaryPath = primary?.path ?? ''
    const secondaryPath = secondary?.path ?? ''

    expect(primaryPath).not.toBe(secondaryPath)
  })

  test('deleting a status removes connected transitions and resets documents in that status', () => {
    const [waitingApproval] = update(
      defaultModel(),
      ClickedRequestedTransition({ transitionId: 'draft-to-pending-approval' }),
    )
    const [nextModel, commands] = update(
      waitingApproval,
      ClickedDeletedStatus({ statusId: 'PENDING_APPROVAL' }),
    )

    expect(
      nextModel.workspace.workflow.statuses.map(status => status.id),
    ).not.toContain('PENDING_APPROVAL')
    expect(
      nextModel.workspace.workflow.transitions.some(
        transition =>
          transition.fromStatusId === 'PENDING_APPROVAL' ||
          transition.toStatusId === 'PENDING_APPROVAL',
      ),
    ).toBe(false)
    expect(documentStatus(nextModel)).toBe('DRAFT')
    expect(nextModel.workspace.selectedItemKind).toBe('Workflow')
    expect(commands.length).toBe(1)
  })

  test('deleting the initial status is blocked', () => {
    const [nextModel, commands] = update(
      defaultModel(),
      ClickedDeletedStatus({ statusId: 'DRAFT' }),
    )

    expect(
      nextModel.workspace.workflow.statuses.map(status => status.id),
    ).toContain('DRAFT')
    expect(nextModel.workspace.banner).toBe('Initial status cannot be deleted')
    expect(commands).toStrictEqual([])
  })

  test('multiple backward transitions to the same node use distinct bezier paths', () => {
    const model = defaultModel()
    const managerReturnTransition: Workflow.Transition = {
      id: 'manager-back-to-draft',
      fromStatusId: 'PENDING_APPROVAL',
      toStatusId: 'DRAFT',
      label: 'Manager returns to draft',
      allowedRoles: ['OrderModerator'],
      requiresComment: false,
      sortOrder: 'test-1',
      effects: [],
    }
    const financeReturnTransition: Workflow.Transition = {
      id: 'finance-back-to-draft',
      fromStatusId: 'APPROVED',
      toStatusId: 'DRAFT',
      label: 'Finance returns to draft',
      allowedRoles: ['OrderModeratorLimited'],
      requiresComment: false,
      sortOrder: 'test-2',
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

    expect(managerBack?.path).not.toBe(financeBack?.path)
    expect(managerBack?.path).toContain('C')
    expect(financeBack?.path).toContain('C')
  })
})
