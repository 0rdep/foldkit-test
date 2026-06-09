import { Array, Option, pipe } from 'effect'

import type * as Workflow from './workflow'

const nodeWidth = 210
const nodeHeight = 96
const columnGap = 220
const rowGap = 116
const paddingX = 160
const paddingY = 280
const cornerRadius = 36
const backEdgeLaneGap = 68

export type GraphNode = Readonly<{
  status: Workflow.Status
  x: number
  y: number
  width: number
  height: number
  column: number
  row: number
}>

export type GraphEdge = Readonly<{
  transition: Workflow.Transition
  from: GraphNode
  to: GraphNode
  path: string
  labelX: number
  labelY: number
  isBackEdge: boolean
}>

export type GraphLayout = Readonly<{
  nodes: ReadonlyArray<GraphNode>
  edges: ReadonlyArray<GraphEdge>
  width: number
  height: number
}>

type DepthEntry = Readonly<{
  statusId: string
  depth: number
}>

const incomingTransitions = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
): ReadonlyArray<Workflow.Transition> =>
  Array.filter(
    workflow.transitions,
    transition => transition.toStatusId === statusId,
  )

const depthForStatus = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
  visited: ReadonlyArray<string>,
): number => {
  if (statusId === workflow.initialStatusId) {
    return 0
  }

  if (Array.contains(visited, statusId)) {
    return -1
  }

  const incomingDepths = pipe(
    incomingTransitions(workflow, statusId),
    Array.map(transition =>
      depthForStatus(workflow, transition.fromStatusId, [...visited, statusId]),
    ),
    Array.filter(depth => depth >= 0),
  )

  if (Array.isReadonlyArrayEmpty(incomingDepths)) {
    return -1
  }

  return Math.min(...incomingDepths) + 1
}

const maxDepth = (entries: ReadonlyArray<DepthEntry>): number => {
  const reachableDepths = pipe(
    entries,
    Array.map(entry => entry.depth),
    Array.filter(depth => depth >= 0),
  )

  if (Array.isReadonlyArrayEmpty(reachableDepths)) {
    return 0
  }

  return Math.max(...reachableDepths)
}

const columnForDepth = (depth: number, maxReachableDepth: number): number => {
  if (depth < 0) {
    return maxReachableDepth + 1
  }
  return depth
}

const rowForEntry = (
  entries: ReadonlyArray<DepthEntry>,
  index: number,
  column: number,
  maxReachableDepth: number,
): number =>
  pipe(
    entries.slice(0, index),
    Array.filter(
      entry => columnForDepth(entry.depth, maxReachableDepth) === column,
    ),
  ).length

const nodeForStatus = (
  nodes: ReadonlyArray<GraphNode>,
  statusId: string,
): Option.Option<GraphNode> =>
  pipe(
    nodes,
    Array.findFirst(node => node.status.id === statusId),
  )

const isBackEdge = (from: GraphNode, to: GraphNode): boolean =>
  to.column <= from.column

const backEdgeLaneY = (
  from: GraphNode,
  to: GraphNode,
  laneIndex: number,
): number => {
  const rowOffset = Math.abs(to.row - from.row) * 16
  const columnOffset = Math.abs(to.column - from.column) * 10
  return Math.max(
    32,
    Math.min(from.y, to.y) -
      78 -
      rowOffset -
      columnOffset -
      laneIndex * backEdgeLaneGap,
  )
}

const roundedForwardPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string => {
  if (startY === endY) {
    return `M ${startX} ${startY} H ${endX}`
  }

  const midX = startX + (endX - startX) / 2
  const directionY = endY > startY ? 1 : -1
  const radius = Math.min(
    cornerRadius,
    Math.abs(midX - startX) / 2,
    Math.abs(endY - startY) / 2,
  )

  return `M ${startX} ${startY} H ${midX - radius} Q ${midX} ${startY}, ${midX} ${startY + directionY * radius} V ${endY - directionY * radius} Q ${midX} ${endY}, ${midX + radius} ${endY} H ${endX}`
}

const roundedBackPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  laneY: number,
): string => {
  const sourceTurnX = startX + 120
  const targetTurnX = endX - 120
  const radius = Math.min(
    cornerRadius,
    Math.abs(startY - laneY) / 2,
    Math.abs(endY - laneY) / 2,
  )

  return `M ${startX} ${startY} H ${sourceTurnX - radius} Q ${sourceTurnX} ${startY}, ${sourceTurnX} ${startY - radius} V ${laneY + radius} Q ${sourceTurnX} ${laneY}, ${sourceTurnX - radius} ${laneY} H ${targetTurnX + radius} Q ${targetTurnX} ${laneY}, ${targetTurnX} ${laneY + radius} V ${endY - radius} Q ${targetTurnX} ${endY}, ${targetTurnX + radius} ${endY} H ${endX}`
}

const edgePath = (
  from: GraphNode,
  to: GraphNode,
  backEdgeLaneIndex: number,
): string => {
  if (isBackEdge(from, to)) {
    const startX = from.x + from.width
    const startY = from.y + from.height / 2
    const endX = to.x
    const endY = to.y + to.height / 2
    const laneY = backEdgeLaneY(from, to, backEdgeLaneIndex)
    return roundedBackPath(startX, startY, endX, endY, laneY)
  }

  const startX = from.x + from.width
  const startY = from.y + from.height / 2
  const endX = to.x
  const endY = to.y + to.height / 2
  return roundedForwardPath(startX, startY, endX, endY)
}

const edgeLabelX = (from: GraphNode, to: GraphNode): number => {
  if (isBackEdge(from, to)) {
    return to.x + (from.x + from.width - to.x) / 2
  }
  return from.x + from.width + (to.x - (from.x + from.width)) / 2
}

const edgeLabelY = (
  from: GraphNode,
  to: GraphNode,
  backEdgeLaneIndex: number,
): number => {
  if (isBackEdge(from, to)) {
    return backEdgeLaneY(from, to, backEdgeLaneIndex)
  }
  return (
    from.y +
    from.height / 2 +
    (to.y + to.height / 2 - (from.y + from.height / 2)) / 2
  )
}

const transitionEndpoints = (
  nodes: ReadonlyArray<GraphNode>,
  transition: Workflow.Transition,
): Option.Option<Readonly<{ from: GraphNode; to: GraphNode }>> =>
  Option.all({
    from: nodeForStatus(nodes, transition.fromStatusId),
    to: nodeForStatus(nodes, transition.toStatusId),
  })

const backEdgeLaneIndex = (
  nodes: ReadonlyArray<GraphNode>,
  transitions: ReadonlyArray<Workflow.Transition>,
  transition: Workflow.Transition,
  transitionIndex: number,
): number =>
  pipe(
    transitions.slice(0, transitionIndex),
    Array.filter(
      previousTransition =>
        previousTransition.toStatusId === transition.toStatusId &&
        pipe(
          transitionEndpoints(nodes, previousTransition),
          Option.exists(({ from, to }) => isBackEdge(from, to)),
        ),
    ),
  ).length

export const layout = (workflow: Workflow.WorkflowDefinition): GraphLayout => {
  const depths = Array.map(workflow.statuses, status => ({
    statusId: status.id,
    depth: depthForStatus(workflow, status.id, []),
  }))
  const reachableMaxDepth = maxDepth(depths)
  const nodes = Array.map(workflow.statuses, (status, index) => {
    const depth = Option.match(
      pipe(
        depths,
        Array.findFirst(entry => entry.statusId === status.id),
      ),
      {
        onNone: () => -1,
        onSome: entry => entry.depth,
      },
    )
    const column = columnForDepth(depth, reachableMaxDepth)
    const row = rowForEntry(depths, index, column, reachableMaxDepth)

    return {
      status,
      x: paddingX + column * (nodeWidth + columnGap),
      y: paddingY + row * (nodeHeight + rowGap),
      width: nodeWidth,
      height: nodeHeight,
      column,
      row,
    }
  })

  const edges = pipe(
    workflow.transitions,
    Array.flatMap((transition, transitionIndex) =>
      pipe(
        transitionEndpoints(nodes, transition),
        Option.match({
          onNone: () => [],
          onSome: ({ from, to }) => {
            const laneIndex = backEdgeLaneIndex(
              nodes,
              workflow.transitions,
              transition,
              transitionIndex,
            )

            return [
              {
                transition,
                from,
                to,
                path: edgePath(from, to, laneIndex),
                labelX: edgeLabelX(from, to),
                labelY: edgeLabelY(from, to, laneIndex),
                isBackEdge: isBackEdge(from, to),
              },
            ]
          },
        }),
      ),
    ),
  )

  const maxX = Math.max(...Array.map(nodes, node => node.x + node.width), 0)
  const maxY = Math.max(...Array.map(nodes, node => node.y + node.height), 0)

  return {
    nodes,
    edges,
    width: maxX + paddingX,
    height: maxY + paddingY,
  }
}

export const nodeSize = {
  width: nodeWidth,
  height: nodeHeight,
}
