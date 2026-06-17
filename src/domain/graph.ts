import { Array, Option, pipe } from 'effect'

import type * as Workflow from './workflow'

const nodeWidth = 210
const nodeHeight = 96
const columnGap = 220
const rowGap = 116
const paddingX = 160
const paddingY = 280
const backEdgeLaneGap = 60
const backEdgeLaneStartY = 80
const backEdgeOutset = 96
const edgeRightOverflowPadding = 72
const edgeTargetGap = 8
const routeObstaclePadding = 28
const routeAroundNodeGap = 48
const routeEdgeSeparation = 40
const routeEdgeOverlapPenalty = 9000
const routeEdgeNearPenalty = 800
const routeEdgeCrossingPenalty = 140
const routeTurnPenalty = 140
const routeOppositeVerticalPenalty = 160
const routeSearchMargin = 132

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

type RowEntry = Readonly<{
  statusId: string
  row: number
}>

type Point = Readonly<{
  x: number
  y: number
}>

type Segment = Readonly<{
  from: Point
  to: Point
}>

type Rect = Readonly<{
  left: number
  top: number
  right: number
  bottom: number
}>

type Direction = 'start' | 'horizontal' | 'vertical'

type SearchState = Readonly<{
  point: Point
  direction: Direction
  cost: number
  priority: number
  path: ReadonlyArray<Point>
}>

type SearchGrid = Readonly<{
  xCoordinates: ReadonlyArray<number>
  yCoordinates: ReadonlyArray<number>
  obstacles: ReadonlyArray<Rect>
  priorSegments: ReadonlyArray<Segment>
}>

type RoutedEdge = Readonly<{
  transition: Workflow.Transition
  from: GraphNode
  to: GraphNode
  points: ReadonlyArray<Point>
  isBackEdge: boolean
}>

type CubicSegment = Readonly<{
  from: Point
  controlA: Point
  controlB: Point
  to: Point
}>

type RoundedPathState = Readonly<{
  current: Point
  segments: ReadonlyArray<CubicSegment>
}>

const cornerRadius = 56
const cornerHandleRatio = 0.55

const columnEntries = (
  workflow: Workflow.WorkflowDefinition,
): ReadonlyArray<DepthEntry> => {
  const statusIds = new Set(Array.map(workflow.statuses, status => status.id))
  const initialColumns = new Map<string, number>()

  if (statusIds.has(workflow.initialStatusId)) {
    initialColumns.set(workflow.initialStatusId, 0)
  }

  const columnsChanged = (
    left: ReadonlyMap<string, number>,
    right: ReadonlyMap<string, number>,
  ): boolean =>
    Array.some(
      workflow.statuses,
      status => left.get(status.id) !== right.get(status.id),
    )

  const buildColumns = (
    columns: ReadonlyMap<string, number>,
    remainingPasses: number,
  ): ReadonlyMap<string, number> => {
    if (remainingPasses <= 0) {
      return columns
    }

    const nextColumns = workflow.transitions.reduce<Map<string, number>>(
      (currentColumns, transition) => {
        if (
          !statusIds.has(transition.fromStatusId) ||
          !statusIds.has(transition.toStatusId) ||
          transition.toStatusId === workflow.initialStatusId
        ) {
          return currentColumns
        }

        const fromColumn = currentColumns.get(transition.fromStatusId)

        if (fromColumn === undefined) {
          return currentColumns
        }

        const column = fromColumn + 1
        const currentColumn = currentColumns.get(transition.toStatusId)

        if (currentColumn === undefined || column < currentColumn) {
          currentColumns.set(transition.toStatusId, column)
        }

        return currentColumns
      },
      new Map(columns),
    )

    return columnsChanged(columns, nextColumns)
      ? buildColumns(nextColumns, remainingPasses - 1)
      : nextColumns
  }

  const columns = buildColumns(initialColumns, workflow.statuses.length)

  return Array.map(workflow.statuses, status => ({
    statusId: status.id,
    depth: columns.get(status.id) ?? -1,
  }))
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

const depthEntryForStatus = (
  depths: ReadonlyArray<DepthEntry>,
  statusId: string,
): number =>
  Option.match(
    pipe(
      depths,
      Array.findFirst(entry => entry.statusId === statusId),
    ),
    {
      onNone: () => -1,
      onSome: entry => entry.depth,
    },
  )

const fallbackRowForStatus = (
  workflow: Workflow.WorkflowDefinition,
  depths: ReadonlyArray<DepthEntry>,
  statusId: string,
  maxReachableDepth: number,
): number => {
  const statusIndex = workflow.statuses.findIndex(
    status => status.id === statusId,
  )
  const depth = depthEntryForStatus(depths, statusId)
  const column = columnForDepth(depth, maxReachableDepth)

  if (statusIndex < 0) {
    return 0
  }

  return rowForEntry(depths, statusIndex, column, maxReachableDepth)
}

const forwardOutgoingTransitions = (
  workflow: Workflow.WorkflowDefinition,
  depths: ReadonlyArray<DepthEntry>,
  fromStatusId: string,
): ReadonlyArray<Workflow.Transition> => {
  const fromDepth = depthEntryForStatus(depths, fromStatusId)

  return Array.filter(
    workflow.transitions,
    transition =>
      transition.fromStatusId === fromStatusId &&
      depthEntryForStatus(depths, transition.toStatusId) > fromDepth,
  )
}

const directIncomingTransitions = (
  workflow: Workflow.WorkflowDefinition,
  depths: ReadonlyArray<DepthEntry>,
  statusId: string,
): ReadonlyArray<Workflow.Transition> => {
  const depth = depthEntryForStatus(depths, statusId)

  return Array.filter(
    workflow.transitions,
    transition =>
      transition.toStatusId === statusId &&
      depthEntryForStatus(depths, transition.fromStatusId) < depth,
  )
}

const preferredRowForStatus = (
  workflow: Workflow.WorkflowDefinition,
  depths: ReadonlyArray<DepthEntry>,
  statusId: string,
  maxReachableDepth: number,
  visited: ReadonlyArray<string>,
): number => {
  if (Array.contains(visited, statusId)) {
    return fallbackRowForStatus(workflow, depths, statusId, maxReachableDepth)
  }

  const incoming = directIncomingTransitions(workflow, depths, statusId)

  if (Array.isReadonlyArrayEmpty(incoming)) {
    return fallbackRowForStatus(workflow, depths, statusId, maxReachableDepth)
  }

  const rows = Array.map(incoming, transition => {
    const siblings = forwardOutgoingTransitions(
      workflow,
      depths,
      transition.fromStatusId,
    )
    const siblingIndex = siblings.findIndex(
      sibling => sibling.toStatusId === statusId,
    )
    const parentRow = preferredRowForStatus(
      workflow,
      depths,
      transition.fromStatusId,
      maxReachableDepth,
      [...visited, statusId],
    )

    return (
      parentRow + centeredRowOffset(Math.max(0, siblingIndex), siblings.length)
    )
  })

  return rows.reduce((total, row) => total + row, 0) / rows.length
}

const resolvedRows = (
  workflow: Workflow.WorkflowDefinition,
  depths: ReadonlyArray<DepthEntry>,
  preferredRows: ReadonlyArray<RowEntry>,
  maxReachableDepth: number,
): ReadonlyArray<RowEntry> => {
  const canUseRow = (
    candidate: number,
    occupiedRows: ReadonlyArray<number>,
  ): boolean => occupiedRows.every(row => Math.abs(candidate - row) >= 1)

  const nearestAvailableRow = (
    row: number,
    occupiedRows: ReadonlyArray<number>,
  ): number => {
    if (canUseRow(row, occupiedRows)) {
      return row
    }

    const candidates = Array.flatMap(
      Array.makeBy(occupiedRows.length + 2, index => index + 1),
      offset => [row + offset, row - offset],
    )

    return Option.getOrElse(
      Array.findFirst(candidates, candidate =>
        canUseRow(candidate, occupiedRows),
      ),
      () => row + occupiedRows.length + 1,
    )
  }

  const alignmentPriority = (statusId: string): number =>
    Array.some(
      directIncomingTransitions(workflow, depths, statusId),
      transition => {
        const siblings = forwardOutgoingTransitions(
          workflow,
          depths,
          transition.fromStatusId,
        )

        return siblings.length === 1
      },
    )
      ? 1
      : 0

  return workflow.statuses.flatMap(status => {
    const depth = depthEntryForStatus(depths, status.id)
    const column = columnForDepth(depth, maxReachableDepth)
    const statusesInColumn = workflow.statuses
      .filter(
        item =>
          columnForDepth(
            depthEntryForStatus(depths, item.id),
            maxReachableDepth,
          ) === column,
      )
      .map(item => ({
        statusId: item.id,
        row:
          preferredRows.find(entry => entry.statusId === item.id)?.row ??
          fallbackRowForStatus(workflow, depths, item.id, maxReachableDepth),
        priority: alignmentPriority(item.id),
        index: workflow.statuses.findIndex(status => status.id === item.id),
      }))
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          left.row - right.row ||
          left.index - right.index,
      )

    const resolvedInColumn = statusesInColumn.reduce<ReadonlyArray<RowEntry>>(
      (entries, entry) => {
        const row = nearestAvailableRow(
          entry.row,
          Array.map(entries, current => current.row),
        )
        return [...entries, { statusId: entry.statusId, row }]
      },
      [],
    )

    return resolvedInColumn.filter(entry => entry.statusId === status.id)
  })
}

const normalizedRows = (
  rows: ReadonlyArray<RowEntry>,
): ReadonlyArray<RowEntry> => {
  const minRow = Math.min(...Array.map(rows, entry => entry.row), 0)

  if (minRow >= 0) {
    return rows
  }

  return Array.map(rows, entry => ({
    statusId: entry.statusId,
    row: entry.row - minRow,
  }))
}

const isBackEdge = (from: GraphNode, to: GraphNode): boolean =>
  to.column <= from.column

const backEdgeLaneY = (laneIndex: number): number =>
  backEdgeLaneStartY + laneIndex * backEdgeLaneGap

const point = (x: number, y: number): Point => ({ x, y })

const isSamePoint = (left: Point, right: Point): boolean =>
  left.x === right.x && left.y === right.y

const nodeRect = (node: GraphNode, padding: number): Rect => ({
  left: node.x - padding,
  top: node.y - padding,
  right: node.x + node.width + padding,
  bottom: node.y + node.height + padding,
})

const segment = (from: Point, to: Point): Segment => ({ from, to })

const compactPoints = (points: ReadonlyArray<Point>): ReadonlyArray<Point> =>
  points.reduce<Array<Point>>((compact, p) => {
    const previous = compact[compact.length - 1]
    const beforePrevious = compact[compact.length - 2]

    if (previous !== undefined && isSamePoint(previous, p)) {
      return compact
    }
    if (
      previous !== undefined &&
      beforePrevious !== undefined &&
      ((beforePrevious.x === previous.x && previous.x === p.x) ||
        (beforePrevious.y === previous.y && previous.y === p.y))
    ) {
      compact[compact.length - 1] = p
      return compact
    }
    compact.push(p)
    return compact
  }, [])

const segmentsFromPoints = (
  points: ReadonlyArray<Point>,
): ReadonlyArray<Segment> => {
  const compact = compactPoints(points)

  return compact.slice(1).map((p, index) => segment(compact[index] ?? p, p))
}

const pathFromPoints = (points: ReadonlyArray<Point>): string => {
  const compact = compactPoints(points)
  const first = compact[0]

  if (first === undefined) {
    return ''
  }

  return cubicSegmentsFromPoints(compact).reduce(
    (path, segment) =>
      `${path} C ${segment.controlA.x} ${segment.controlA.y}, ${segment.controlB.x} ${segment.controlB.y}, ${segment.to.x} ${segment.to.y}`,
    `M ${first.x} ${first.y}`,
  )
}

const fallbackRoute = (start: Point, end: Point): ReadonlyArray<Point> => {
  const midX = start.x + (end.x - start.x) / 2
  return compactPoints([start, point(midX, start.y), point(midX, end.y), end])
}

const pointDistance = (from: Point, to: Point): number =>
  Math.hypot(to.x - from.x, to.y - from.y)

const unitVector = (from: Point, to: Point): Point => {
  const distance = pointDistance(from, to)

  if (distance === 0) {
    return point(0, 0)
  }

  return point((to.x - from.x) / distance, (to.y - from.y) / distance)
}

const straightCubicSegment = (from: Point, to: Point): CubicSegment => {
  const dx = to.x - from.x
  const dy = to.y - from.y

  return {
    from,
    controlA: point(from.x + dx * 0.5, from.y + dy * 0.5),
    controlB: point(to.x - dx * 0.5, to.y - dy * 0.5),
    to,
  }
}

const appendSegment = (
  segments: ReadonlyArray<CubicSegment>,
  segment: CubicSegment,
): ReadonlyArray<CubicSegment> =>
  isSamePoint(segment.from, segment.to) ? segments : [...segments, segment]

const isCollinear = (previous: Point, corner: Point, next: Point): boolean =>
  (previous.x === corner.x && corner.x === next.x) ||
  (previous.y === corner.y && corner.y === next.y)

const visualizedRoutePoints = (
  input: RoutableTransition,
  searchPoints: ReadonlyArray<Point>,
): ReadonlyArray<Point> => {
  const start = visualStart(input)
  const to = input.to
  const end = visualEnd(to)
  const first = searchPoints[0]
  const last = searchPoints[searchPoints.length - 1]

  if (first === undefined || last === undefined) {
    return compactPoints([start, end])
  }

  return compactPoints([
    start,
    point(first.x, start.y),
    ...searchPoints,
    point(last.x, end.y),
    end,
  ])
}

const cubicSegmentsFromPoints = (
  points: ReadonlyArray<Point>,
): ReadonlyArray<CubicSegment> => {
  const compact = compactPoints(points)
  const first = compact[0]
  const last = compact[compact.length - 1]

  if (first === undefined || last === undefined || compact.length < 2) {
    return []
  }

  const rounded = compact.slice(1, -1).reduce<RoundedPathState>(
    (state, corner, index) => {
      const previous = compact[index] ?? state.current
      const next = compact[index + 2] ?? corner
      const previousLength = pointDistance(previous, corner)
      const nextLength = pointDistance(corner, next)
      const radius = Math.min(
        cornerRadius,
        previousLength * 0.5,
        nextLength * 0.5,
      )

      if (radius < 2 || isCollinear(previous, corner, next)) {
        return state
      }

      const back = unitVector(corner, previous)
      const forward = unitVector(corner, next)
      const entry = point(
        corner.x + back.x * radius,
        corner.y + back.y * radius,
      )
      const exit = point(
        corner.x + forward.x * radius,
        corner.y + forward.y * radius,
      )
      const lineIn = straightCubicSegment(state.current, entry)
      const cornerSegment = {
        from: entry,
        controlA: point(
          entry.x - back.x * radius * cornerHandleRatio,
          entry.y - back.y * radius * cornerHandleRatio,
        ),
        controlB: point(
          exit.x - forward.x * radius * cornerHandleRatio,
          exit.y - forward.y * radius * cornerHandleRatio,
        ),
        to: exit,
      }

      return {
        current: exit,
        segments: appendSegment(
          appendSegment(state.segments, lineIn),
          cornerSegment,
        ),
      }
    },
    { current: first, segments: [] },
  )

  return appendSegment(
    rounded.segments,
    straightCubicSegment(rounded.current, last),
  )
}

type RoutableTransition = Readonly<{
  transition: Workflow.Transition
  from: GraphNode
  to: GraphNode
  laneIndex: number
}>

const visualStart = (input: RoutableTransition): Point =>
  point(
    input.from.x + input.from.width + 6,
    input.from.y + input.from.height / 2,
  )

const routeStart = (input: RoutableTransition): Point =>
  point(
    input.from.x + input.from.width + routeObstaclePadding,
    input.from.y + input.from.height / 2,
  )

const visualEnd = (node: GraphNode): Point =>
  point(node.x - edgeTargetGap, node.y + node.height / 2)

const routeEnd = (node: GraphNode): Point =>
  point(node.x - routeObstaclePadding, node.y + node.height / 2)

const cubicPointAt = (segment: CubicSegment, t: number): Point => {
  const inverse = 1 - t
  const a = inverse * inverse * inverse
  const b = 3 * inverse * inverse * t
  const c = 3 * inverse * t * t
  const d = t * t * t

  return point(
    a * segment.from.x +
      b * segment.controlA.x +
      c * segment.controlB.x +
      d * segment.to.x,
    a * segment.from.y +
      b * segment.controlA.y +
      c * segment.controlB.y +
      d * segment.to.y,
  )
}

const pointInsideRect = (p: Point, rect: Rect): boolean =>
  p.x > rect.left && p.x < rect.right && p.y > rect.top && p.y < rect.bottom

const routeTouchesNode = (
  points: ReadonlyArray<Point>,
  nodes: ReadonlyArray<GraphNode>,
): boolean => {
  const nodeBodies = nodes.map(node => nodeRect(node, 4))
  const samples = cubicSegmentsFromPoints(points).flatMap(segment =>
    globalThis.Array.from({ length: 20 }, (_, index) =>
      cubicPointAt(segment, (index + 1) / 21),
    ),
  )

  return samples.some(sample =>
    nodeBodies.some(rect => pointInsideRect(sample, rect)),
  )
}

const intermediateRouteNodes = (
  nodes: ReadonlyArray<GraphNode>,
  input: RoutableTransition,
): ReadonlyArray<GraphNode> =>
  nodes.filter(
    node =>
      node.status.id !== input.from.status.id &&
      node.status.id !== input.to.status.id,
  )

const fallbackAroundNodesRoute = (
  nodes: ReadonlyArray<GraphNode>,
  input: RoutableTransition,
  start: Point,
  end: Point,
): ReadonlyArray<Point> => {
  const laneOffset = input.laneIndex * backEdgeLaneGap
  const laneRects = nodes.map(node =>
    nodeRect(node, routeObstaclePadding + routeAroundNodeGap),
  )
  const topY = Math.max(
    40,
    Math.min(...laneRects.map(rect => rect.top), start.y, end.y) -
      routeSearchMargin -
      laneOffset,
  )
  const bottomY =
    Math.max(...laneRects.map(rect => rect.bottom), start.y, end.y) +
    routeSearchMargin +
    laneOffset
  const intermediateNodes = intermediateRouteNodes(nodes, input)
  const candidates = [
    compactPoints([start, point(start.x, topY), point(end.x, topY), end]),
    compactPoints([start, point(start.x, bottomY), point(end.x, bottomY), end]),
  ]
  const clearCandidate = candidates.find(
    candidate =>
      !routeTouchesNode(
        visualizedRoutePoints(input, candidate),
        intermediateNodes,
      ),
  )

  return clearCandidate ?? fallbackRoute(start, end)
}

const manhattanDistance = (from: Point, to: Point): number =>
  Math.abs(to.x - from.x) + Math.abs(to.y - from.y)

const uniqueSortedNumbers = (
  values: ReadonlyArray<number>,
): ReadonlyArray<number> =>
  globalThis.Array.from(new Set(values.filter(Number.isFinite))).sort(
    (left, right) => left - right,
  )

const rangesOverlap = (
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean => Math.max(leftStart, rightStart) < Math.min(leftEnd, rightEnd)

const rangeOverlapLength = (
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): number =>
  Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart))

const isHorizontalSegment = (s: Segment): boolean => s.from.y === s.to.y

const isVerticalSegment = (s: Segment): boolean => s.from.x === s.to.x

const segmentCrosses = (candidate: Segment, prior: Segment): boolean => {
  if (isHorizontalSegment(candidate) === isHorizontalSegment(prior)) {
    return false
  }

  const horizontal = isHorizontalSegment(candidate) ? candidate : prior
  const vertical = isVerticalSegment(candidate) ? candidate : prior
  const minX = Math.min(horizontal.from.x, horizontal.to.x)
  const maxX = Math.max(horizontal.from.x, horizontal.to.x)
  const minY = Math.min(vertical.from.y, vertical.to.y)
  const maxY = Math.max(vertical.from.y, vertical.to.y)

  return (
    vertical.from.x >= minX &&
    vertical.from.x <= maxX &&
    horizontal.from.y >= minY &&
    horizontal.from.y <= maxY
  )
}

const parallelSegmentPenalty = (candidate: Segment, prior: Segment): number => {
  if (isHorizontalSegment(candidate) && isHorizontalSegment(prior)) {
    const overlap = rangeOverlapLength(
      Math.min(candidate.from.x, candidate.to.x),
      Math.max(candidate.from.x, candidate.to.x),
      Math.min(prior.from.x, prior.to.x),
      Math.max(prior.from.x, prior.to.x),
    )
    const distance = Math.abs(candidate.from.y - prior.from.y)

    if (overlap === 0 || distance >= routeEdgeSeparation) {
      return 0
    }

    if (distance === 0) {
      return routeEdgeOverlapPenalty + overlap * 20
    }

    return (
      routeEdgeNearPenalty * (1 - distance / routeEdgeSeparation) + overlap * 2
    )
  }

  if (isVerticalSegment(candidate) && isVerticalSegment(prior)) {
    const overlap = rangeOverlapLength(
      Math.min(candidate.from.y, candidate.to.y),
      Math.max(candidate.from.y, candidate.to.y),
      Math.min(prior.from.y, prior.to.y),
      Math.max(prior.from.y, prior.to.y),
    )
    const distance = Math.abs(candidate.from.x - prior.from.x)

    if (overlap === 0 || distance >= routeEdgeSeparation) {
      return 0
    }

    if (distance === 0) {
      return routeEdgeOverlapPenalty + overlap * 20
    }

    return (
      routeEdgeNearPenalty * (1 - distance / routeEdgeSeparation) + overlap * 2
    )
  }

  return 0
}

const priorSegmentPenalty = (
  candidate: Segment,
  priorSegments: ReadonlyArray<Segment>,
): number =>
  priorSegments.reduce(
    (total, prior) =>
      total +
      parallelSegmentPenalty(candidate, prior) +
      (segmentCrosses(candidate, prior) ? routeEdgeCrossingPenalty : 0),
    0,
  )

const segmentIntersectsRectInterior = (s: Segment, rect: Rect): boolean => {
  if (s.from.y === s.to.y) {
    const minX = Math.min(s.from.x, s.to.x)
    const maxX = Math.max(s.from.x, s.to.x)

    return (
      s.from.y > rect.top &&
      s.from.y < rect.bottom &&
      rangesOverlap(minX, maxX, rect.left, rect.right)
    )
  }

  if (s.from.x === s.to.x) {
    const minY = Math.min(s.from.y, s.to.y)
    const maxY = Math.max(s.from.y, s.to.y)

    return (
      s.from.x > rect.left &&
      s.from.x < rect.right &&
      rangesOverlap(minY, maxY, rect.top, rect.bottom)
    )
  }

  return false
}

const segmentIsClear = (
  from: Point,
  to: Point,
  obstacles: ReadonlyArray<Rect>,
): boolean =>
  obstacles.every(
    rect => !segmentIntersectsRectInterior(segment(from, to), rect),
  )

const pointIsRoutable = (p: Point, obstacles: ReadonlyArray<Rect>): boolean =>
  obstacles.every(rect => !pointInsideRect(p, rect))

const routeGrid = (
  nodes: ReadonlyArray<GraphNode>,
  input: RoutableTransition,
  priorSegments: ReadonlyArray<Segment>,
): SearchGrid => {
  const start = routeStart(input)
  const end = routeEnd(input.to)
  const obstacles = nodes.map(node => nodeRect(node, routeObstaclePadding))
  const aroundNodeLanes = nodes.map(node =>
    nodeRect(node, routeObstaclePadding + routeAroundNodeGap),
  )
  const laneOffset = input.laneIndex * backEdgeLaneGap
  const obstacleXCoordinates = obstacles.flatMap(rect => [
    rect.left,
    rect.right,
  ])
  const obstacleYCoordinates = obstacles.flatMap(rect => [
    rect.top,
    rect.bottom,
  ])
  const aroundNodeXCoordinates = aroundNodeLanes.flatMap(rect => [
    rect.left,
    rect.right,
  ])
  const aroundNodeYCoordinates = aroundNodeLanes.flatMap(rect => [
    rect.top,
    rect.bottom,
  ])
  const priorSegmentXCoordinates = priorSegments.flatMap(s => {
    if (isVerticalSegment(s)) {
      return [
        s.from.x - routeEdgeSeparation,
        s.from.x,
        s.from.x + routeEdgeSeparation,
      ]
    }

    return [s.from.x, s.to.x]
  })
  const priorSegmentYCoordinates = priorSegments.flatMap(s => {
    if (isHorizontalSegment(s)) {
      return [
        s.from.y - routeEdgeSeparation,
        s.from.y,
        s.from.y + routeEdgeSeparation,
      ]
    }

    return [s.from.y, s.to.y]
  })
  const allXCoordinates = [
    start.x,
    end.x,
    ...obstacleXCoordinates,
    ...aroundNodeXCoordinates,
    ...priorSegmentXCoordinates,
  ]
  const allYCoordinates = [
    start.y,
    end.y,
    ...obstacleYCoordinates,
    ...aroundNodeYCoordinates,
    ...priorSegmentYCoordinates,
  ]
  const minX = Math.min(...allXCoordinates) - routeSearchMargin - laneOffset
  const maxX = Math.max(...allXCoordinates) + routeSearchMargin + laneOffset
  const minY = Math.max(
    40,
    Math.min(...allYCoordinates) - routeSearchMargin - laneOffset,
  )
  const maxY = Math.max(...allYCoordinates) + routeSearchMargin + laneOffset
  const isBack = isBackEdge(input.from, input.to)
  const backEdgeX = Math.max(start.x, end.x) + backEdgeOutset + laneOffset
  const midX = start.x + (end.x - start.x) / 2
  const midY = start.y + (end.y - start.y) / 2

  return {
    obstacles,
    priorSegments,
    xCoordinates: uniqueSortedNumbers([
      minX,
      maxX,
      midX,
      start.x,
      end.x,
      ...(isBack ? [backEdgeX] : []),
      ...obstacleXCoordinates,
      ...aroundNodeXCoordinates,
      ...priorSegmentXCoordinates,
    ]),
    yCoordinates: uniqueSortedNumbers([
      minY,
      maxY,
      midY,
      start.y,
      end.y,
      ...(isBack ? [backEdgeLaneY(input.laneIndex)] : []),
      ...obstacleYCoordinates,
      ...aroundNodeYCoordinates,
      ...priorSegmentYCoordinates,
    ]),
  }
}

const routeDirection = (from: Point, to: Point): Direction =>
  from.x === to.x ? 'vertical' : 'horizontal'

const routeVerticalDirectionPenalty = (
  from: Point,
  to: Point,
  preferredDirection: number,
): number => {
  if (preferredDirection === 0 || from.y === to.y) {
    return 0
  }

  return Math.sign(to.y - from.y) === preferredDirection
    ? 0
    : routeOppositeVerticalPenalty
}

const pointKey = (p: Point): string => `${p.x},${p.y}`

const searchStateKey = (state: SearchState): string =>
  `${pointKey(state.point)}:${state.direction}`

const adjacentCoordinatePoints = (
  current: Point,
  grid: SearchGrid,
): ReadonlyArray<Point> => {
  const xIndex = grid.xCoordinates.findIndex(value => value === current.x)
  const yIndex = grid.yCoordinates.findIndex(value => value === current.y)
  const previousX = xIndex > 0 ? grid.xCoordinates[xIndex - 1] : undefined
  const nextX =
    xIndex >= 0 && xIndex < grid.xCoordinates.length - 1
      ? grid.xCoordinates[xIndex + 1]
      : undefined
  const previousY = yIndex > 0 ? grid.yCoordinates[yIndex - 1] : undefined
  const nextY =
    yIndex >= 0 && yIndex < grid.yCoordinates.length - 1
      ? grid.yCoordinates[yIndex + 1]
      : undefined
  const candidates = [
    ...(previousX === undefined ? [] : [point(previousX, current.y)]),
    ...(nextX === undefined ? [] : [point(nextX, current.y)]),
    ...(previousY === undefined ? [] : [point(current.x, previousY)]),
    ...(nextY === undefined ? [] : [point(current.x, nextY)]),
  ]

  return candidates.filter(
    candidate =>
      pointIsRoutable(candidate, grid.obstacles) &&
      segmentIsClear(current, candidate, grid.obstacles),
  )
}

const popLowestPriority = (
  states: Array<SearchState>,
): Option.Option<SearchState> => {
  let bestIndex = -1
  let bestPriority = Number.POSITIVE_INFINITY

  states.forEach((state, index) => {
    if (state.priority < bestPriority) {
      bestIndex = index
      bestPriority = state.priority
    }
  })

  if (bestIndex < 0) {
    return Option.none()
  }

  const state = states.splice(bestIndex, 1)[0]

  return state === undefined ? Option.none() : Option.some(state)
}

const routeSearch = (
  open: ReadonlyArray<SearchState>,
  closed: ReadonlySet<string>,
  bestCosts: ReadonlyMap<string, number>,
  end: Point,
  grid: SearchGrid,
  preferredVerticalDirection: number,
): Option.Option<ReadonlyArray<Point>> => {
  const pending: Array<SearchState> = [...open]
  const visited = new Set(closed)
  const costs = new Map(bestCosts)
  let remainingIterations =
    grid.xCoordinates.length * grid.yCoordinates.length * 3

  while (remainingIterations > 0) {
    remainingIterations -= 1

    const maybeState = popLowestPriority(pending)

    if (Option.isNone(maybeState)) {
      return Option.none()
    }

    const state = maybeState.value
    const currentKey = searchStateKey(state)
    const bestCost = costs.get(currentKey)

    if (
      visited.has(currentKey) ||
      (bestCost !== undefined && state.cost > bestCost)
    ) {
      continue
    }

    if (isSamePoint(state.point, end)) {
      return Option.some(state.path)
    }

    const nextStates = adjacentCoordinatePoints(state.point, grid).flatMap(
      nextPoint => {
        const direction = routeDirection(state.point, nextPoint)
        const turnCost =
          state.direction !== 'start' && state.direction !== direction
            ? routeTurnPenalty
            : 0
        const edgeCost = priorSegmentPenalty(
          segment(state.point, nextPoint),
          grid.priorSegments,
        )
        const cost =
          state.cost +
          manhattanDistance(state.point, nextPoint) +
          turnCost +
          routeVerticalDirectionPenalty(
            state.point,
            nextPoint,
            preferredVerticalDirection,
          ) +
          edgeCost
        const nextState = {
          point: nextPoint,
          direction,
          cost,
          priority: cost + manhattanDistance(nextPoint, end),
          path: [...state.path, nextPoint],
        }
        const nextKey = searchStateKey(nextState)
        const bestNextCost = costs.get(nextKey)

        if (
          visited.has(nextKey) ||
          (bestNextCost !== undefined && bestNextCost <= cost)
        ) {
          return []
        }

        return [nextState]
      },
    )
    visited.add(currentKey)
    nextStates.forEach(nextState => {
      costs.set(searchStateKey(nextState), nextState.cost)
      pending.push(nextState)
    })
  }

  return Option.none()
}

const pathfindRoute = (
  nodes: ReadonlyArray<GraphNode>,
  input: RoutableTransition,
  priorSegments: ReadonlyArray<Segment>,
): ReadonlyArray<Point> => {
  const start = routeStart(input)
  const end = routeEnd(input.to)
  const grid = routeGrid(nodes, input, priorSegments)
  const preferredVerticalDirection = Math.sign(end.y - start.y)
  const initialState = {
    point: start,
    direction: 'start' as const,
    cost: 0,
    priority: manhattanDistance(start, end),
    path: [start],
  }
  const route = Option.match(
    routeSearch(
      [initialState],
      new Set(),
      new Map([[searchStateKey(initialState), 0]]),
      end,
      grid,
      preferredVerticalDirection,
    ),
    {
      onNone: () => fallbackAroundNodesRoute(nodes, input, start, end),
      onSome: compactPoints,
    },
  )

  if (
    routeTouchesNode(
      visualizedRoutePoints(input, route),
      intermediateRouteNodes(nodes, input),
    )
  ) {
    return fallbackAroundNodesRoute(nodes, input, start, end)
  }

  return route
}

const routeTransition = (
  nodes: ReadonlyArray<GraphNode>,
  input: RoutableTransition,
  priorSegments: ReadonlyArray<Segment>,
): RoutedEdge => {
  const backEdge = isBackEdge(input.from, input.to)
  const points = visualizedRoutePoints(
    input,
    pathfindRoute(nodes, input, priorSegments),
  )

  return {
    transition: input.transition,
    from: input.from,
    to: input.to,
    points,
    isBackEdge: backEdge,
  }
}

const routeTransitions = (
  nodes: ReadonlyArray<GraphNode>,
  inputs: ReadonlyArray<RoutableTransition>,
): ReadonlyArray<RoutedEdge> =>
  inputs.reduce<{
    edges: Array<RoutedEdge>
    priorSegments: Array<Segment>
  }>(
    (state, input) => {
      const edge = routeTransition(nodes, input, state.priorSegments)

      state.edges.push(edge)
      state.priorSegments.push(...segmentsFromPoints(edge.points))

      return {
        edges: state.edges,
        priorSegments: state.priorSegments,
      }
    },
    { edges: [], priorSegments: [] },
  ).edges

const centeredRowOffset = (rowIndex: number, rowCount: number): number =>
  rowIndex - (rowCount - 1) / 2

const maxEdgeX = (edge: GraphEdge): number => {
  if (edge.isBackEdge) {
    return edge.from.x + edge.from.width + backEdgeOutset
  }

  return Math.max(edge.from.x + edge.from.width, edge.to.x)
}

export const layout = (workflow: Workflow.WorkflowDefinition): GraphLayout => {
  const depths = columnEntries(workflow)
  const reachableMaxDepth = maxDepth(depths)
  const preferredRows = Array.map(workflow.statuses, status => ({
    statusId: status.id,
    row: preferredRowForStatus(
      workflow,
      depths,
      status.id,
      reachableMaxDepth,
      [],
    ),
  }))
  const rows = normalizedRows(
    resolvedRows(workflow, depths, preferredRows, reachableMaxDepth),
  )
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
    const row =
      rows.find(entry => entry.statusId === status.id)?.row ??
      rowForEntry(depths, index, column, reachableMaxDepth)

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
  const nodeByStatusId = new Map(
    Array.map(nodes, node => [node.status.id, node] as const),
  )
  const backEdgeLaneCounts = new Map<string, number>()

  const routableTransitions = workflow.transitions.reduce<
    Array<RoutableTransition>
  >((entries, transition) => {
    const from = nodeByStatusId.get(transition.fromStatusId)
    const to = nodeByStatusId.get(transition.toStatusId)

    if (from === undefined || to === undefined) {
      return entries
    }

    const laneIndex = backEdgeLaneCounts.get(transition.toStatusId) ?? 0

    entries.push({ transition, from, to, laneIndex })

    if (isBackEdge(from, to)) {
      backEdgeLaneCounts.set(transition.toStatusId, laneIndex + 1)
    }

    return entries
  }, [])
  const routedEdges = routeTransitions(nodes, routableTransitions)
  const routed = routedEdges.reduce<{
    edges: Array<GraphEdge>
    routePoints: Array<Point>
  }>(
    (state, routedEdge) => {
      state.edges.push({
        transition: routedEdge.transition,
        from: routedEdge.from,
        to: routedEdge.to,
        path: pathFromPoints(routedEdge.points),
        isBackEdge: routedEdge.isBackEdge,
      })
      state.routePoints.push(...routedEdge.points)

      return state
    },
    { edges: [], routePoints: [] },
  )
  const edges = routed.edges

  const maxX = Math.max(
    ...Array.map(nodes, node => node.x + node.width),
    ...Array.map(edges, maxEdgeX),
    ...Array.map(routed.routePoints, p => p.x),
    ...Array.map(nodes, node => node.x + node.width + routeObstaclePadding),
    0,
  )
  const maxY = Math.max(
    ...Array.map(nodes, node => node.y + node.height),
    ...Array.map(routed.routePoints, p => p.y),
    0,
  )

  return {
    nodes,
    edges,
    width: maxX + paddingX + edgeRightOverflowPadding,
    height: maxY + paddingY,
  }
}

export const nodeSize = {
  width: nodeWidth,
  height: nodeHeight,
}
