import { Disclosure, Textarea } from '@foldkit/ui'
import { Array, Effect, Option, Queue, Stream } from 'effect'
import { Mount } from 'foldkit'
import { type Document, type Html, html } from 'foldkit/html'

import { Graph, Workflow } from '../domain'
import {
  ClickedAddedDeliveryAutomation,
  ClickedAddedStatus,
  ClickedAppliedDefaultFlow,
  ClickedClosedGraphContextMenu,
  ClickedClosedWorkflowJsonModal,
  ClickedCopiedWorkflowExportJson,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedHidLeftPanel,
  ClickedMovedTransitionEarlier,
  ClickedMovedTransitionLater,
  ClickedOpenedLeftPanel,
  ClickedOpenedWorkflowExportModal,
  ClickedOpenedWorkflowImportModal,
  ClickedPublishedRemoteFlow,
  ClickedRemovedDeliveryAutomation,
  ClickedSavedRemoteFlowDraft,
  ClickedSelectedWorkflow,
  ClickedToggledStatusActionDisclosure,
  ClickedToggledStatusActionRole,
  ClickedToggledTransitionRole,
  GotAutomationsDisclosureMessage,
  GotDeliveryAutomationDisclosureMessage,
  GotEditableActionsDisclosureMessage,
  GotFlowHistoryDisclosureMessage,
  GotIncomingTransitionsDisclosureMessage,
  GotNodeTransitionDisclosureMessage,
  GotOutgoingTransitionsDisclosureMessage,
  MovedGraphClientPointer,
  PressedGraphCanvas,
  PressedGraphCanvasContextMenu,
  PressedGraphNodeContextMenu,
  PressedGraphTransitionContextMenu,
  PressedTransitionOutput,
  ReleasedGraphCanvasPointer,
  ReleasedGraphClientPointer,
  ScrolledCanvas,
  SelectedDeliveryAutomationStatus,
  SelectedTransitionAutomationType,
  SelectedStatus,
  SelectedStatusType,
  SubmittedWorkflowImportJson,
  SuppressedNativeGraphContextMenu,
  UpdatedDeliveryAutomationEnabled,
  UpdatedFlowDocumentType,
  UpdatedStatusId,
  UpdatedStatusName,
  UpdatedTargetCompanyId,
  UpdatedTransitionAutomationOnly,
  UpdatedWorkflowImportJson,
} from '../message'
import type { Message } from '../message'
import type { Model } from '../model'
import { formatWorkflowExportJson } from '../page/workspace/model'

const fallbackCanvasWidth = 1920
const fallbackCanvasHeight = 1080
const nodeWidth = 210
const nodeHeight = 96
const nodeFill = '#0f172a'
const nodeStroke = '#334155'
const draftNodeStroke = '#38bdf8'
const finalNodeStroke = '#ef4444'
const transitionStroke = '#64748b'
const incomingTransitionStroke = '#facc15'
const outgoingTransitionStroke = '#22c55e'
const selectedNodeStroke = '#f8fafc'
const pinRadius = 8
const pinHitRadius = 16
const edgeHitSampleCount = 24
const edgeHitRadius = 18
const edgeAnimationDuration = '1.6s'
const numberPattern = /-?\d+(?:\.\d+)?/g
const statusTypes: ReadonlyArray<Workflow.StatusType> = [
  'draft',
  'normal',
  'final',
]
const transitionRoleIds: ReadonlyArray<string> = [
  'SystemAdmin',
  'OrderModerator',
  'OrderModeratorLimited',
  'OrderCreator',
  'CatalogManager',
  'ClientUser',
]

const transitionAutomationTypes: ReadonlyArray<Workflow.AutomationType> = [
  'REQUISITION_ALL_ITEMS_LINKED',
  'REQUISITION_ITEM_UNLINKED',
  'ORDER_DELIVERY_FULLY_DELIVERED',
  'ORDER_DELIVERY_PARTIALLY_DELIVERED',
  'ORDER_DELIVERY_PARTIALLY_DELIVERED_COMPLETION_REQUIRED',
  'ORDER_DELIVERY_REOPENED',
]

const transitionAutomationTypeLabel = (
  automationType: Workflow.AutomationType,
): string =>
  automationType
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const transitionAutomationTypeFromValue = (
  value: string,
): Workflow.AutomationType =>
  transitionAutomationTypes.find(automationType => automationType === value) ??
  'ORDER_DELIVERY_FULLY_DELIVERED'

type Point = Readonly<{ x: number; y: number }>
type CubicSegment = Readonly<{
  from: Point
  controlA: Point
  controlB: Point
  to: Point
}>

type CanvasSize = Readonly<{
  width: number
  height: number
}>

type DeliveryAutomationStatusField =
  | 'fullyDeliveredStatusId'
  | 'partiallyDeliveredStatusId'
  | 'partiallyDeliveredCompletionRequiredStatusId'

const graphLayoutCache = new WeakMap<
  Model['workspace']['workflow'],
  Graph.GraphLayout
>()

const graphLayout = (workflow: Model['workspace']['workflow']) => {
  const cached = graphLayoutCache.get(workflow)
  if (cached !== undefined) {
    return cached
  }

  const layout = Graph.layout(workflow)
  graphLayoutCache.set(workflow, layout)
  return layout
}

const currentCanvasSize = (): CanvasSize => ({
  width:
    globalThis.innerWidth > 0 ? globalThis.innerWidth : fallbackCanvasWidth,
  height:
    globalThis.innerHeight > 0 ? globalThis.innerHeight : fallbackCanvasHeight,
})

const isLoading = (model: Model): boolean =>
  !Array.isReadonlyArrayEmpty(model.workspace.pendingOperations)

const pendingOperationLabel = (
  operation: Model['workspace']['pendingOperations'][number],
): string => {
  if (operation === 'loadCompanies') {
    return 'Loading companies'
  }
  if (operation === 'loadFlowDefinitions') {
    return 'Loading workflow'
  }
  if (operation === 'loadFlowHistory') {
    return 'Loading flow history'
  }
  if (operation === 'saveFlowDraft') {
    return 'Saving draft'
  }
  return 'Publishing flow'
}

const loadingMessage = (model: Model): string =>
  Option.match(Array.head(model.workspace.pendingOperations), {
    onNone: () => 'Working',
    onSome: pendingOperationLabel,
  })

const ObserveCanvasWheel = Mount.defineStream(
  'ObserveCanvasWheel',
  ScrolledCanvas,
)(element =>
  Stream.callback<typeof ScrolledCanvas.Type>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const listener = (event: Event) => {
          if (!(event instanceof WheelEvent)) {
            return
          }

          event.preventDefault()
          const rect = element.getBoundingClientRect()
          Queue.offerUnsafe(
            queue,
            ScrolledCanvas({
              deltaY: event.deltaY,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
            }),
          )
        }

        element.addEventListener('wheel', listener, { passive: false })

        return listener
      }),
      listener =>
        Effect.sync(() => element.removeEventListener('wheel', listener)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  ),
)

const ObserveGraphPointer = Mount.defineStream(
  'ObserveGraphPointer',
  MovedGraphClientPointer,
  ReleasedGraphClientPointer,
)(element =>
  Stream.callback<
    typeof MovedGraphClientPointer.Type | typeof ReleasedGraphClientPointer.Type
  >(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const pointerDownListener = (event: Event) => {
          if (event instanceof PointerEvent && event.button === 0) {
            element.setPointerCapture(event.pointerId)
          }
        }
        const pointerMoveListener = (event: Event) => {
          if (!(event instanceof PointerEvent)) {
            return
          }

          Queue.offerUnsafe(
            queue,
            MovedGraphClientPointer({ x: event.clientX, y: event.clientY }),
          )
        }
        const pointerUpListener = (event: Event) => {
          if (!(event instanceof PointerEvent)) {
            return
          }

          if (element.hasPointerCapture(event.pointerId)) {
            element.releasePointerCapture(event.pointerId)
          }

          Queue.offerUnsafe(
            queue,
            ReleasedGraphClientPointer({ x: event.clientX, y: event.clientY }),
          )
        }

        element.addEventListener('pointerdown', pointerDownListener)
        element.addEventListener('pointermove', pointerMoveListener)
        element.addEventListener('pointerup', pointerUpListener)

        return () => {
          element.removeEventListener('pointerdown', pointerDownListener)
          element.removeEventListener('pointermove', pointerMoveListener)
          element.removeEventListener('pointerup', pointerUpListener)
        }
      }),
      cleanup => Effect.sync(cleanup),
    ).pipe(Effect.flatMap(() => Effect.never)),
  ),
)

const graphPoint = (model: Model, point: Point): Point => ({
  x: (point.x - model.workspace.graphPanX) / model.workspace.graphZoom,
  y: (point.y - model.workspace.graphPanY) / model.workspace.graphZoom,
})

const nodeAtPoint = (
  layout: Graph.GraphLayout,
  point: Point,
): Option.Option<Graph.GraphNode> =>
  Array.findFirst(
    layout.nodes,
    node =>
      point.x >= node.x &&
      point.x <= node.x + node.width &&
      point.y >= node.y &&
      point.y <= node.y + node.height,
  )

const outputPinPoint = (node: Graph.GraphNode): Point => ({
  x: node.x + node.width,
  y: node.y + node.height / 2,
})

const pointDistanceSquared = (left: Point, right: Point): number => {
  const deltaX = left.x - right.x
  const deltaY = left.y - right.y
  return deltaX * deltaX + deltaY * deltaY
}

const canUseInputPin = (node: Graph.GraphNode): boolean =>
  node.status.type !== 'draft'

const canUseOutputPin = (node: Graph.GraphNode): boolean =>
  node.status.type !== 'final'

const hasTransitionBetween = (
  model: Model,
  fromStatusId: string,
  toStatusId: string,
): boolean =>
  Array.some(
    model.workspace.workflow.transitions,
    transition =>
      transition.fromStatusId === fromStatusId &&
      transition.toStatusId === toStatusId,
  )

const canDropTransitionOnNode = (
  model: Model,
  node: Graph.GraphNode,
): boolean => {
  if (model.workspace.transitionDragState._tag !== 'TransitionDragging') {
    return false
  }

  const fromStatusId = model.workspace.transitionDragState.fromStatusId

  return (
    fromStatusId !== node.status.id &&
    canUseInputPin(node) &&
    !hasTransitionBetween(model, fromStatusId, node.status.id)
  )
}

const pinAtPoint = (
  nodes: ReadonlyArray<Graph.GraphNode>,
  point: Point,
  graphZoom: number,
  canUsePin: (node: Graph.GraphNode) => boolean,
  pinPoint: (node: Graph.GraphNode) => Point,
): Option.Option<Graph.GraphNode> => {
  const radius = pinHitRadius / graphZoom

  return Array.findFirst(
    nodes,
    node =>
      canUsePin(node) &&
      pointDistanceSquared(point, pinPoint(node)) <= radius * radius,
  )
}

const outputPinAtPoint = (
  layout: Graph.GraphLayout,
  point: Point,
  graphZoom: number,
): Option.Option<Graph.GraphNode> =>
  pinAtPoint(layout.nodes, point, graphZoom, canUseOutputPin, outputPinPoint)

const edgePathNumbers = (path: string): ReadonlyArray<number> =>
  Array.map(path.match(numberPattern) ?? [], Number)

const edgeSegments = (path: string): ReadonlyArray<CubicSegment> => {
  const numbers = edgePathNumbers(path)
  const startX = numbers[0]
  const startY = numbers[1]

  if (startX === undefined || startY === undefined) {
    return []
  }

  const curveNumbers = numbers.slice(2)
  const curveCount = Math.floor(curveNumbers.length / 6)

  return Array.map(
    Array.makeBy(curveCount, index => index),
    index => {
      const offset = index * 6
      const previousOffset = offset - 6
      const from =
        index === 0
          ? { x: startX, y: startY }
          : {
              x: curveNumbers[previousOffset + 4] ?? startX,
              y: curveNumbers[previousOffset + 5] ?? startY,
            }

      return {
        from,
        controlA: {
          x: curveNumbers[offset] ?? from.x,
          y: curveNumbers[offset + 1] ?? from.y,
        },
        controlB: {
          x: curveNumbers[offset + 2] ?? from.x,
          y: curveNumbers[offset + 3] ?? from.y,
        },
        to: {
          x: curveNumbers[offset + 4] ?? from.x,
          y: curveNumbers[offset + 5] ?? from.y,
        },
      }
    },
  )
}

const cubicPointAt = (segment: CubicSegment, progress: number): Point => {
  const inverse = 1 - progress
  const startWeight = inverse * inverse * inverse
  const controlAWeight = 3 * inverse * inverse * progress
  const controlBWeight = 3 * inverse * progress * progress
  const endWeight = progress * progress * progress

  return {
    x:
      startWeight * segment.from.x +
      controlAWeight * segment.controlA.x +
      controlBWeight * segment.controlB.x +
      endWeight * segment.to.x,
    y:
      startWeight * segment.from.y +
      controlAWeight * segment.controlA.y +
      controlBWeight * segment.controlB.y +
      endWeight * segment.to.y,
  }
}

const edgeHitSamples = (path: string): ReadonlyArray<Point> =>
  Array.flatMap(edgeSegments(path), segment => [
    segment.from,
    ...Array.map(
      Array.makeBy(edgeHitSampleCount, index => index),
      index => cubicPointAt(segment, (index + 1) / edgeHitSampleCount),
    ),
  ])

const segmentDistanceSquared = (
  point: Point,
  from: Point,
  to: Point,
): number => {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY

  if (lengthSquared === 0) {
    return pointDistanceSquared(point, from)
  }

  const rawProgress =
    ((point.x - from.x) * deltaX + (point.y - from.y) * deltaY) / lengthSquared
  const progress = Math.max(0, Math.min(1, rawProgress))
  const projection = {
    x: from.x + progress * deltaX,
    y: from.y + progress * deltaY,
  }

  return pointDistanceSquared(point, projection)
}

const edgeDistanceSquared = (edge: Graph.GraphEdge, point: Point): number => {
  const samples = edgeHitSamples(edge.path)

  return Array.reduce(
    Array.makeBy(Math.max(0, samples.length - 1), index => index),
    Number.POSITIVE_INFINITY,
    (minimum, index) => {
      const from = samples[index]
      const to = samples[index + 1]

      if (from === undefined || to === undefined) {
        return minimum
      }

      return Math.min(minimum, segmentDistanceSquared(point, from, to))
    },
  )
}

const edgeAtPoint = (
  layout: Graph.GraphLayout,
  point: Point,
  graphZoom: number,
): Option.Option<Graph.GraphEdge> => {
  const radius = edgeHitRadius / graphZoom

  return Array.findFirst(
    layout.edges,
    edge => edgeDistanceSquared(edge, point) <= radius * radius,
  )
}

const canvasPointerDown = (
  model: Model,
  button: number,
  _screenX: number,
  _screenY: number,
  clientX: number,
  clientY: number,
): Option.Option<Message> => {
  const layout = graphLayout(model.workspace.workflow)
  const graphPosition = graphPoint(model, { x: clientX, y: clientY })

  if (button === 2) {
    return Option.some(
      Option.match(nodeAtPoint(layout, graphPosition), {
        onSome: node =>
          PressedGraphNodeContextMenu({
            statusId: node.status.id,
            clientX,
            clientY,
          }),
        onNone: () =>
          Option.match(
            edgeAtPoint(layout, graphPosition, model.workspace.graphZoom),
            {
              onSome: edge =>
                PressedGraphTransitionContextMenu({
                  transitionId: edge.transition.id,
                  clientX,
                  clientY,
                }),
              onNone: () => PressedGraphCanvasContextMenu({ clientX, clientY }),
            },
          ),
      }),
    )
  }

  return Option.match(
    outputPinAtPoint(layout, graphPosition, model.workspace.graphZoom),
    {
      onSome: node =>
        Option.some(
          PressedTransitionOutput({
            statusId: node.status.id,
            screenX: clientX,
            screenY: clientY,
          }),
        ),
      onNone: () =>
        Option.match(nodeAtPoint(layout, graphPosition), {
          onSome: node =>
            Option.some(SelectedStatus({ statusId: node.status.id })),
          onNone: () =>
            Option.some(
              PressedGraphCanvas({ screenX: clientX, screenY: clientY }),
            ),
        }),
    },
  )
}

const selectedStatusId = (model: Model): Option.Option<string> => {
  if (model.workspace.selectedItemKind === 'Status') {
    return Option.some(model.workspace.selectedItemId)
  }

  return Option.none()
}

const edgeColor = (model: Model, edge: Graph.GraphEdge): string =>
  Option.match(selectedStatusId(model), {
    onNone: () => transitionStroke,
    onSome: statusId => {
      if (edge.transition.toStatusId === statusId) {
        return incomingTransitionStroke
      }
      if (edge.transition.fromStatusId === statusId) {
        return outgoingTransitionStroke
      }
      return transitionStroke
    },
  })

const isHighlightedEdge = (model: Model, edge: Graph.GraphEdge): boolean =>
  Option.match(selectedStatusId(model), {
    onNone: () => false,
    onSome: statusId =>
      edge.transition.toStatusId === statusId ||
      edge.transition.fromStatusId === statusId,
  })

const nodeStrokeColor = (node: Graph.GraphNode): string => {
  if (node.status.type === 'draft') {
    return draftNodeStroke
  }
  if (node.status.type === 'final') {
    return finalNodeStroke
  }
  return nodeStroke
}

const selectedCompanyId = (model: Model): string => {
  if (model.workspace.targetCompanyId !== '') {
    return model.workspace.targetCompanyId
  }

  return Option.match(Array.head(model.workspace.companies), {
    onNone: () => '',
    onSome: company => `${company.id}`,
  })
}

const flowTypeLabel = (
  flowType: Model['workspace']['selectedFlowDocumentType'],
): string => (flowType === 'order' ? 'Order' : 'Requisition')

const flowStateLabel = (
  state: Model['workspace']['workflow']['state'],
): string => state ?? 'draft'

const statusTypeFromString = (value: string): Workflow.StatusType => {
  if (value === 'draft') {
    return 'draft'
  }
  if (value === 'final') {
    return 'final'
  }
  return 'normal'
}

const selectedStatus = (model: Model): Option.Option<Workflow.Status> => {
  if (model.workspace.selectedItemKind !== 'Status') {
    return Option.none()
  }

  return Workflow.findStatus(
    model.workspace.workflow,
    model.workspace.selectedItemId,
  )
}

const statusName = (
  workflow: Workflow.WorkflowDefinition,
  statusId: string,
): string =>
  Option.match(Workflow.findStatus(workflow, statusId), {
    onNone: () => statusId,
    onSome: status => status.name,
  })

const transitionIndex = (
  workflow: Workflow.WorkflowDefinition,
  transitionId: string,
): number =>
  workflow.transitions.findIndex(transition => transition.id === transitionId)

const svgDefs = (): Html => {
  const h = html<Message>()

  return h.defs(
    [],
    [
      h.marker(
        [
          h.Id('arrow'),
          h.Attribute('markerWidth', '10'),
          h.Attribute('markerHeight', '10'),
          h.Attribute('refX', '9'),
          h.Attribute('refY', '3'),
          h.Attribute('orient', 'auto'),
          h.Attribute('markerUnits', 'strokeWidth'),
        ],
        [
          h.path(
            [
              h.Attribute('d', 'M 0 0 L 10 3 L 0 6 z'),
              h.Attribute('fill', 'currentColor'),
            ],
            [],
          ),
        ],
      ),
    ],
  )
}

const edgeShape = (model: Model, edge: Graph.GraphEdge): Html => {
  const h = html<Message>()
  const color = edgeColor(model, edge)
  const packet = (radius: number, opacity: string, begin: string): Html =>
    h.circle(
      [
        h.Attribute('r', `${radius}`),
        h.Attribute('fill', '#f8fafc'),
        h.Attribute('stroke', color),
        h.Attribute('stroke-width', '2'),
        h.Attribute('opacity', opacity),
      ],
      [
        h.animateMotion(
          [
            h.Attribute('path', edge.path),
            h.Attribute('dur', edgeAnimationDuration),
            h.Attribute('begin', begin),
            h.Attribute('repeatCount', 'indefinite'),
          ],
          [],
        ),
      ],
    )

  return h.g(
    [h.Style({ color })],
    [
      h.path(
        [
          h.Attribute('d', edge.path),
          h.Attribute('fill', 'none'),
          h.Attribute('stroke', color),
          h.Attribute('stroke-width', color === transitionStroke ? '2' : '3'),
          h.Attribute('stroke-linecap', 'round'),
          h.Attribute('stroke-linejoin', 'round'),
          h.Attribute('marker-end', 'url(#arrow)'),
        ],
        [],
      ),
      ...(isHighlightedEdge(model, edge)
        ? [packet(5.5, '0.95', '0s'), packet(3.8, '0.55', '-0.26s')]
        : []),
    ],
  )
}

const nodePinShapes = (
  model: Model,
  node: Graph.GraphNode,
): ReadonlyArray<Html> => {
  const h = html<Message>()
  const isDraggingFromNode =
    model.workspace.transitionDragState._tag === 'TransitionDragging' &&
    model.workspace.transitionDragState.fromStatusId === node.status.id
  const isInputDropTarget =
    model.workspace.transitionDragState._tag === 'TransitionDragging' &&
    canDropTransitionOnNode(model, node)

  return [
    ...(canUseInputPin(node)
      ? [
          h.circle(
            [
              h.Attribute('cx', `${node.x}`),
              h.Attribute('cy', `${node.y + node.height / 2}`),
              h.Attribute(
                'r',
                `${isInputDropTarget ? pinRadius + 2 : pinRadius}`,
              ),
              h.Attribute('fill', isInputDropTarget ? '#1e293b' : '#020617'),
              h.Attribute(
                'stroke',
                isInputDropTarget ? incomingTransitionStroke : '#94a3b8',
              ),
              h.Attribute('stroke-width', '2'),
            ],
            [],
          ),
        ]
      : []),
    ...(canUseOutputPin(node)
      ? [
          h.circle(
            [
              h.Attribute('cx', `${node.x + node.width}`),
              h.Attribute('cy', `${node.y + node.height / 2}`),
              h.Attribute(
                'r',
                `${isDraggingFromNode ? pinRadius + 2 : pinRadius}`,
              ),
              h.Attribute('fill', isDraggingFromNode ? '#1e293b' : '#020617'),
              h.Attribute(
                'stroke',
                isDraggingFromNode ? outgoingTransitionStroke : '#94a3b8',
              ),
              h.Attribute('stroke-width', '2'),
            ],
            [],
          ),
        ]
      : []),
  ]
}

const nodeShape = (model: Model, node: Graph.GraphNode): Html => {
  const h = html<Message>()
  const isSelected =
    model.workspace.selectedItemKind === 'Status' &&
    model.workspace.selectedItemId === node.status.id

  return h.g(
    [h.Style({ userSelect: 'none', WebkitUserSelect: 'none' })],
    [
      h.rect(
        [
          h.Attribute('x', `${node.x}`),
          h.Attribute('y', `${node.y}`),
          h.Attribute('width', `${nodeWidth}`),
          h.Attribute('height', `${nodeHeight}`),
          h.Attribute('rx', '18'),
          h.Attribute('fill', nodeFill),
          h.Attribute(
            'stroke',
            isSelected ? selectedNodeStroke : nodeStrokeColor(node),
          ),
          h.Attribute('stroke-width', isSelected ? '3' : '2'),
        ],
        [],
      ),
      h.text(
        [
          h.Attribute('x', `${node.x + 18}`),
          h.Attribute('y', `${node.y + 31}`),
          h.Attribute('fill', '#f8fafc'),
          h.Attribute('font-size', '16'),
          h.Attribute('font-weight', '700'),
          h.Attribute('font-family', 'Inter, system-ui, sans-serif'),
          h.Attribute('user-select', 'none'),
        ],
        [node.status.name],
      ),
      h.text(
        [
          h.Attribute('x', `${node.x + 18}`),
          h.Attribute('y', `${node.y + 59}`),
          h.Attribute('fill', '#94a3b8'),
          h.Attribute('font-size', '12'),
          h.Attribute('font-weight', '600'),
          h.Attribute('font-family', 'Inter, system-ui, sans-serif'),
          h.Attribute('user-select', 'none'),
        ],
        [node.status.type],
      ),
      ...nodePinShapes(model, node),
    ],
  )
}

const draftTransitionPath = (model: Model, layout: Graph.GraphLayout): Html => {
  const h = html<Message>()

  if (model.workspace.transitionDragState._tag !== 'TransitionDragging') {
    return h.empty
  }

  const dragState = model.workspace.transitionDragState

  return Option.match(
    Array.findFirst(
      layout.nodes,
      node => node.status.id === dragState.fromStatusId,
    ),
    {
      onNone: () => h.empty,
      onSome: node => {
        const start = outputPinPoint(node)
        const end = graphPoint(model, {
          x: dragState.currentScreenX,
          y: dragState.currentScreenY,
        })
        const controlOffset = Math.max(80, Math.abs(end.x - start.x) * 0.45)

        return h.path(
          [
            h.Attribute(
              'd',
              `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`,
            ),
            h.Attribute('fill', 'none'),
            h.Attribute('stroke', outgoingTransitionStroke),
            h.Attribute('stroke-width', '3'),
            h.Attribute('stroke-linecap', 'round'),
            h.Attribute('stroke-dasharray', '8 8'),
          ],
          [],
        )
      },
    },
  )
}

const graphSvg = (model: Model, size: CanvasSize): Html => {
  const h = html<Message>()
  const layout = graphLayout(model.workspace.workflow)

  return h.svg(
    [
      h.Attribute('viewBox', `0 0 ${size.width} ${size.height}`),
      h.OnMount(ObserveGraphPointer()),
      h.Style({ userSelect: 'none', WebkitUserSelect: 'none' }),
      h.Class('block h-full w-full select-none'),
    ],
    [
      h.rect(
        [
          h.Attribute('x', '0'),
          h.Attribute('y', '0'),
          h.Attribute('width', `${size.width}`),
          h.Attribute('height', `${size.height}`),
          h.Attribute('fill', '#020617'),
        ],
        [],
      ),
      svgDefs(),
      h.g(
        [
          h.Style({ userSelect: 'none', WebkitUserSelect: 'none' }),
          h.Attribute(
            'transform',
            `translate(${model.workspace.graphPanX} ${model.workspace.graphPanY}) scale(${model.workspace.graphZoom})`,
          ),
        ],
        [
          ...Array.map(layout.edges, edge => edgeShape(model, edge)),
          draftTransitionPath(model, layout),
          ...Array.map(layout.nodes, node => nodeShape(model, node)),
        ],
      ),
    ],
  )
}

const panelSelect = (
  label: string,
  value: string,
  onChange: (value: string) => Message,
  children: ReadonlyArray<Html>,
): Html => {
  const h = html<Message>()

  return h.label(
    [h.Class('block rounded-xl border border-slate-800 bg-slate-900/70 p-3')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        [label],
      ),
      h.select(
        [
          h.Value(value),
          h.OnChange(onChange),
          h.Class(
            'mt-2 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
          ),
        ],
        children,
      ),
    ],
  )
}

const companySelect = (model: Model): Html => {
  const h = html<Message>()
  const value = selectedCompanyId(model)

  return panelSelect(
    'Company',
    value,
    value => UpdatedTargetCompanyId({ value }),
    Array.isReadonlyArrayEmpty(model.workspace.companies)
      ? [h.option([h.Value(''), h.Disabled(true)], ['Loading companies...'])]
      : Array.map(model.workspace.companies, company =>
          h.option(
            [h.Value(`${company.id}`), h.Selected(`${company.id}` === value)],
            [
              company.active
                ? `[${company.id}] ${company.name}`
                : `[${company.id}] ${company.name} (inactive)`,
            ],
          ),
        ),
  )
}

const flowTypeSelect = (model: Model): Html => {
  const h = html<Message>()

  return panelSelect(
    'Flow type',
    model.workspace.selectedFlowDocumentType,
    value =>
      UpdatedFlowDocumentType({
        value: value === 'order' ? 'order' : 'requisition',
      }),
    [
      h.option(
        [
          h.Value('requisition'),
          h.Selected(
            model.workspace.selectedFlowDocumentType === 'requisition',
          ),
        ],
        [flowTypeLabel('requisition')],
      ),
      h.option(
        [
          h.Value('order'),
          h.Selected(model.workspace.selectedFlowDocumentType === 'order'),
        ],
        [flowTypeLabel('order')],
      ),
    ],
  )
}

const chevronIcon = (isOpen: boolean): Html => {
  const h = html<Message>()

  return h.svg(
    [
      h.Attribute('viewBox', '0 0 20 20'),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', 'currentColor'),
      h.Attribute('stroke-width', '2'),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.AriaHidden(true),
      h.Class('h-4 w-4 text-white'),
    ],
    [
      h.path(
        [
          h.Attribute(
            'd',
            isOpen ? 'M 5 12 L 10 7 L 15 12' : 'M 5 8 L 10 13 L 15 8',
          ),
        ],
        [],
      ),
    ],
  )
}

const disclosureButtonClass =
  'flex w-full cursor-pointer select-none items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-900 focus:outline-none focus:ring-0'

const remoteFlowActions = (model: Model): Html => {
  const h = html<Message>()
  const statusText = model.workspace.isDirty
    ? 'Unsaved local changes'
    : 'Draft is up to date locally'

  const actionButton = (
    label: string,
    message: Message,
    className: string,
  ): Html =>
    h.button(
      [
        h.Type('button'),
        h.OnClick(message),
        h.Class(
          `cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${className}`,
        ),
      ],
      [label],
    )

  return h.section(
    [h.Class('rounded-xl border border-slate-800 bg-slate-900/70 p-3')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Remote draft'],
      ),
      h.div([h.Class('mt-1 text-xs text-slate-500')], [statusText]),
      h.div(
        [h.Class('mt-3 grid grid-cols-2 gap-2')],
        [
          actionButton(
            'Restore default',
            ClickedAppliedDefaultFlow(),
            'col-span-2 border border-amber-400/60 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20',
          ),
          actionButton(
            'Save draft',
            ClickedSavedRemoteFlowDraft(),
            'border border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900',
          ),
          actionButton(
            'Publish',
            ClickedPublishedRemoteFlow(),
            'bg-sky-500 text-slate-950 hover:bg-sky-400',
          ),
        ],
      ),
    ],
  )
}

const workflowJsonActions = (): Html => {
  const h = html<Message>()
  const buttonClass =
    'cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400'

  return h.section(
    [h.Class('rounded-xl border border-slate-800 bg-slate-900/70 p-3')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Workflow JSON'],
      ),
      h.p(
        [h.Class('mt-1 text-xs leading-5 text-slate-500')],
        [
          'Export this workflow as formatted JSON, or import previously exported JSON into the current workflow.',
        ],
      ),
      h.div(
        [h.Class('mt-3 grid grid-cols-2 gap-2')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedOpenedWorkflowExportModal()),
              h.Class(buttonClass),
            ],
            ['Export'],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedOpenedWorkflowImportModal()),
              h.Class(buttonClass),
            ],
            ['Import'],
          ),
        ],
      ),
    ],
  )
}

const modalFeedback = (model: Model): Html => {
  const h = html<Message>()

  if (model.workspace.banner === '') {
    return h.empty
  }

  return h.p(
    [
      h.Attribute('role', 'status'),
      h.Class(
        'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200',
      ),
    ],
    [model.workspace.banner],
  )
}

const workflowJsonModal = (model: Model): Html => {
  const h = html<Message>()
  const state = model.workspace.workflowJsonModalState

  if (state._tag === 'WorkflowJsonModalClosed') {
    return h.empty
  }

  const isImport = state._tag === 'WorkflowImportJsonModalOpen'
  const title = isImport ? 'Import workflow JSON' : 'Export workflow JSON'
  const description = isImport
    ? 'Paste JSON exported from this app. Importing applies its workflow contents to the current workflow.'
    : 'This is the full formatted JSON for the current workflow.'

  return h.div(
    [h.Class('fixed inset-0 z-40 flex items-center justify-center p-4')],
    [
      h.div(
        [
          h.OnClick(ClickedClosedWorkflowJsonModal()),
          h.Class('absolute inset-0 bg-slate-950/75 backdrop-blur-sm'),
        ],
        [],
      ),
      h.section(
        [
          h.Attribute('role', 'dialog'),
          h.Attribute('aria-modal', 'true'),
          h.Attribute('aria-labelledby', 'workflow-json-modal-title'),
          h.Class(
            'relative z-10 flex max-h-[calc(100vh-2rem)] w-[min(64rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl shadow-black/50',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4',
              ),
            ],
            [
              h.div(
                [h.Class('min-w-0')],
                [
                  h.h2(
                    [
                      h.Id('workflow-json-modal-title'),
                      h.Class('text-base font-semibold text-slate-100'),
                    ],
                    [title],
                  ),
                  h.p(
                    [h.Class('mt-1 text-sm leading-6 text-slate-500')],
                    [description],
                  ),
                ],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('aria-label', 'Close workflow JSON modal'),
                  h.OnClick(ClickedClosedWorkflowJsonModal()),
                  h.Class(
                    'cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400',
                  ),
                ],
                ['Close'],
              ),
            ],
          ),
          h.div(
            [h.Class('min-h-0 flex-1 space-y-4 overflow-auto p-5')],
            [
              modalFeedback(model),
              isImport
                ? importWorkflowJsonForm(state.value)
                : exportWorkflowJsonView(model),
            ],
          ),
        ],
      ),
    ],
  )
}

const exportWorkflowJsonView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('space-y-4')],
    [
      h.pre(
        [
          h.Attribute('tabindex', '0'),
          h.Class(
            'max-h-[60vh] overflow-auto rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs leading-5 text-slate-200',
          ),
        ],
        [formatWorkflowExportJson(model.workspace.workflow)],
      ),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedCopiedWorkflowExportJson()),
              h.Class(
                'cursor-pointer rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300',
              ),
            ],
            ['Copy JSON'],
          ),
        ],
      ),
    ],
  )
}

const importWorkflowJsonForm = (value: string): Html => {
  const h = html<Message>()
  const canImport = value.trim() !== ''

  return h.div(
    [h.Class('space-y-4')],
    [
      Textarea.view<Message>({
        id: 'workflow-import-json',
        value,
        rows: 18,
        placeholder: 'Paste exported workflow JSON here',
        onInput: value => UpdatedWorkflowImportJson({ value }),
        toView: attributes =>
          h.div(
            [h.Class('space-y-2')],
            [
              h.label(
                [
                  ...attributes.label,
                  h.Class(
                    'text-xs font-medium uppercase tracking-wide text-slate-500',
                  ),
                ],
                ['JSON'],
              ),
              h.textarea(
                [
                  ...attributes.textarea,
                  h.Class(
                    'max-h-[60vh] min-h-80 w-full resize-y rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
                  ),
                ],
                [],
              ),
              h.span(
                [...attributes.description, h.Class('sr-only')],
                ['Workflow JSON import input'],
              ),
            ],
          ),
      }),
      h.div(
        [h.Class('flex justify-end')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(SubmittedWorkflowImportJson()),
              ...(canImport ? [] : [h.Disabled(true)]),
              h.Class(
                canImport
                  ? 'cursor-pointer rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300'
                  : 'cursor-not-allowed rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-500',
              ),
            ],
            ['Import JSON'],
          ),
        ],
      ),
    ],
  )
}

const deliveryAutomationStatusSelect = (
  model: Model,
  label: string,
  field: DeliveryAutomationStatusField,
  value: string,
): Html => {
  const h = html<Message>()
  const hasSelectedStatus = Option.isSome(
    Workflow.findStatus(model.workspace.workflow, value),
  )

  return h.label(
    [h.Class('block')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        [label],
      ),
      h.select(
        [
          h.Value(value),
          h.OnChange(statusId =>
            SelectedDeliveryAutomationStatus({ field, statusId }),
          ),
          h.Class(
            'mt-2 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
          ),
        ],
        [
          ...(hasSelectedStatus
            ? []
            : [
                h.option(
                  [h.Value(value), h.Selected(true), h.Disabled(true)],
                  [`Missing status (${value})`],
                ),
              ]),
          ...Array.map(model.workspace.workflow.statuses, status =>
            h.option(
              [h.Value(status.id), h.Selected(status.id === value)],
              [`${status.name} (${status.id})`],
            ),
          ),
        ],
      ),
    ],
  )
}

const deliveryAutomationEditor = (
  model: Model,
  automation: Workflow.DeliveryAutomation,
): Html => {
  const h = html<Message>()
  const disclosure =
    model.deliveryAutomationDisclosure ??
    Disclosure.init({ id: 'delivery-automation-disclosure' })

  return h.submodel({
    slotId: 'delivery-automation-disclosure',
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.article(
          [h.Class('rounded-xl border border-slate-800 bg-slate-900/70 p-3')],
          [
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex w-full cursor-pointer select-none items-start justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-900 focus:outline-none focus:ring-0',
                ),
              ],
              [
                h.div(
                  [h.Class('min-w-0')],
                  [
                    h.h3(
                      [
                        h.Class(
                          'truncate text-sm font-semibold text-slate-100',
                        ),
                      ],
                      ['Delivery automation'],
                    ),
                    h.p(
                      [h.Class('mt-1 text-xs leading-5 text-slate-500')],
                      ['Moves orders when shipment delivery progress changes.'],
                    ),
                  ],
                ),
                h.span(
                  [h.Class('flex shrink-0 items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          automation.enabled
                            ? 'rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-100'
                            : 'rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                        ),
                      ],
                      [automation.enabled ? 'Enabled' : 'Disabled'],
                    ),
                    chevronIcon(disclosure.isOpen),
                  ],
                ),
              ],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-3 pt-3')],
                  [
                    h.label(
                      [
                        h.Class(
                          'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3',
                        ),
                      ],
                      [
                        h.input([
                          h.Type('checkbox'),
                          h.Checked(automation.enabled),
                          h.OnClick(
                            UpdatedDeliveryAutomationEnabled({
                              value: !automation.enabled,
                            }),
                          ),
                          h.Class(
                            'mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-950',
                          ),
                        ]),
                        h.span(
                          [h.Class('min-w-0')],
                          [
                            h.span(
                              [
                                h.Class(
                                  'block text-sm font-semibold text-slate-100',
                                ),
                              ],
                              ['Enabled'],
                            ),
                            h.span(
                              [
                                h.Class(
                                  'mt-1 block text-xs leading-5 text-slate-500',
                                ),
                              ],
                              [
                                automation.enabled
                                  ? 'Shipment updates can move orders automatically.'
                                  : 'Keep the configuration but stop applying it.',
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                    deliveryAutomationStatusSelect(
                      model,
                      'Fully delivered status',
                      'fullyDeliveredStatusId',
                      automation.fullyDeliveredStatusId,
                    ),
                    deliveryAutomationStatusSelect(
                      model,
                      'Partially delivered status',
                      'partiallyDeliveredStatusId',
                      automation.partiallyDeliveredStatusId,
                    ),
                    deliveryAutomationStatusSelect(
                      model,
                      'Partial completion required status',
                      'partiallyDeliveredCompletionRequiredStatusId',
                      automation.partiallyDeliveredCompletionRequiredStatusId,
                    ),
                    h.button(
                      [
                        h.Type('button'),
                        h.OnClick(ClickedRemovedDeliveryAutomation()),
                        h.Class(
                          'w-full cursor-pointer rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-400/20 focus:outline-none focus:ring-2 focus:ring-red-300',
                        ),
                      ],
                      ['Remove delivery automation'],
                    ),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message =>
      GotDeliveryAutomationDisclosureMessage({ message }),
  })
}

const automations = (model: Model): Html => {
  const h = html<Message>()
  const disclosure =
    model.automationsDisclosure ??
    Disclosure.init({ id: 'automations-disclosure' })
  const automation = model.workspace.workflow.deliveryAutomation
  const canAddDeliveryAutomation =
    model.workspace.selectedFlowDocumentType === 'order'

  return h.submodel({
    slotId: 'automations-disclosure',
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.section(
          [h.Class('space-y-3')],
          [
            h.button(
              [...attributes.button, h.Class(disclosureButtonClass)],
              [
                h.span([], ['Automations']),
                h.span(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          'rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                        ),
                      ],
                      [automation === undefined ? '0' : '1'],
                    ),
                    chevronIcon(disclosure.isOpen),
                  ],
                ),
              ],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-3')],
                  [
                    automation === undefined
                      ? h.div(
                          [
                            h.Class(
                              'space-y-3 rounded-xl border border-dashed border-slate-800 p-4',
                            ),
                          ],
                          [
                            h.p(
                              [h.Class('text-sm text-slate-400')],
                              [
                                canAddDeliveryAutomation
                                  ? 'No automations are configured for this flow.'
                                  : 'Delivery automation is available for order flows.',
                              ],
                            ),
                            h.button(
                              [
                                h.Type('button'),
                                h.OnClick(ClickedAddedDeliveryAutomation()),
                                ...(!canAddDeliveryAutomation
                                  ? [h.Disabled(true)]
                                  : []),
                                h.Class(
                                  canAddDeliveryAutomation
                                    ? 'w-full cursor-pointer rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300'
                                    : 'w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-600',
                                ),
                              ],
                              ['Add delivery automation'],
                            ),
                          ],
                        )
                      : deliveryAutomationEditor(model, automation),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message => GotAutomationsDisclosureMessage({ message }),
  })
}

const flowHistory = (model: Model): Html => {
  const h = html<Message>()
  const disclosure =
    model.flowHistoryDisclosure ??
    Disclosure.init({ id: 'flow-history-disclosure' })

  return h.submodel({
    slotId: 'flow-history-disclosure',
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.section(
          [h.Class('space-y-3')],
          [
            h.button(
              [...attributes.button, h.Class(disclosureButtonClass)],
              [h.span([], ['Flow history']), chevronIcon(disclosure.isOpen)],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-2')],
                  [
                    Array.match(model.workspace.flowHistory, {
                      onEmpty: () =>
                        h.div(
                          [
                            h.Class(
                              'rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500',
                            ),
                          ],
                          ['No flow history loaded'],
                        ),
                      onNonEmpty: definitions =>
                        h.ul(
                          [h.Class('space-y-2')],
                          Array.map(definitions, definition =>
                            h.li(
                              [
                                h.Class(
                                  'rounded-xl border border-slate-800 bg-slate-900/50 p-3',
                                ),
                              ],
                              [
                                h.div(
                                  [
                                    h.Class(
                                      'flex items-center justify-between gap-3',
                                    ),
                                  ],
                                  [
                                    h.div(
                                      [
                                        h.Class(
                                          'min-w-0 truncate text-sm font-semibold text-slate-100',
                                        ),
                                      ],
                                      [`Version ${definition.version}`],
                                    ),
                                    h.div(
                                      [
                                        h.Class(
                                          'rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300',
                                        ),
                                      ],
                                      [flowStateLabel(definition.state)],
                                    ),
                                  ],
                                ),
                                h.div(
                                  [h.Class('mt-2 text-xs text-slate-500')],
                                  [
                                    `${definition.statuses.length} statuses, ${definition.transitions.length} transitions`,
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                    }),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message => GotFlowHistoryDisclosureMessage({ message }),
  })
}

const leftPanel = (model: Model): Html => {
  const h = html<Message>()
  const panelState = model.leftPanelState ?? { _tag: 'LeftPanelOpen' }

  if (panelState._tag === 'LeftPanelClosed') {
    return h.div(
      [h.Class('absolute left-4 top-4 z-20')],
      [
        h.button(
          [
            h.Type('button'),
            h.Attribute('aria-label', 'Open information panel'),
            h.OnClick(ClickedOpenedLeftPanel()),
            h.Class(
              'cursor-pointer rounded-xl border border-slate-700 bg-slate-950/85 px-3 py-2 text-sm font-semibold text-slate-100 shadow-2xl shadow-black/30 backdrop-blur hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400',
            ),
          ],
          ['Panel'],
        ),
      ],
    )
  }

  return h.div(
    [
      h.Class(
        'absolute left-4 top-4 z-20 max-h-[calc(100vh-2rem)] w-[min(22rem,calc(100vw-2rem))]',
      ),
    ],
    [
      h.aside(
        [
          h.Class(
            'flex max-h-[calc(100vh-2rem)] cursor-default flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3',
              ),
            ],
            [
              h.div(
                [h.Class('min-w-0')],
                [
                  h.h2(
                    [h.Class('truncate text-sm font-semibold text-slate-100')],
                    [model.workspace.workflow.name],
                  ),
                  h.div(
                    [h.Class('mt-1 text-xs text-slate-500')],
                    [`Flow ${model.workspace.workflow.id}`],
                  ),
                ],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('aria-label', 'Hide information panel'),
                  h.OnClick(ClickedHidLeftPanel()),
                  h.Class(
                    'cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400',
                  ),
                ],
                ['Hide'],
              ),
            ],
          ),
          h.div(
            [h.Class('space-y-4 overflow-auto p-4')],
            [
              companySelect(model),
              flowTypeSelect(model),
              h.div(
                [
                  h.Class(
                    'rounded-xl border border-slate-800 bg-slate-900/70 p-3',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        'text-xs font-medium uppercase tracking-wide text-slate-500',
                      ),
                    ],
                    ['Current version'],
                  ),
                  h.div(
                    [
                      h.Class(
                        'mt-1 text-sm font-semibold tabular-nums text-slate-100',
                      ),
                    ],
                    [`Version ${model.workspace.workflow.version}`],
                  ),
                ],
              ),
              remoteFlowActions(model),
              workflowJsonActions(),
              automations(model),
              flowHistory(model),
            ],
          ),
        ],
      ),
    ],
  )
}

const nodePanelTextField = (status: Workflow.Status): Html => {
  const h = html<Message>()

  return h.label(
    [h.Class('block')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Display name'],
      ),
      h.input([
        h.Key(`node-name-${status.id}`),
        h.Type('text'),
        h.Value(status.name),
        h.OnInput(value => UpdatedStatusName({ statusId: status.id, value })),
        h.Class(
          'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
        ),
      ]),
    ],
  )
}

const nodePanelIdField = (status: Workflow.Status): Html => {
  const h = html<Message>()

  return h.label(
    [h.Class('block')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Status ID'],
      ),
      h.input([
        h.Type('text'),
        h.Value(status.id),
        h.OnInput(value => UpdatedStatusId({ statusId: status.id, value })),
        h.Class(
          'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
        ),
      ]),
    ],
  )
}

const nodePanelTypeField = (status: Workflow.Status): Html => {
  const h = html<Message>()

  return h.label(
    [h.Class('block')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Behavior'],
      ),
      h.select(
        [
          h.Key(`node-type-${status.id}`),
          h.Value(status.type),
          h.OnChange(value =>
            SelectedStatusType({
              statusId: status.id,
              value: statusTypeFromString(value),
            }),
          ),
          h.Class(
            'mt-2 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
          ),
        ],
        Array.map(statusTypes, statusType =>
          h.option(
            [h.Value(statusType), h.Selected(statusType === status.type)],
            [Workflow.statusTypeLabel(statusType)],
          ),
        ),
      ),
    ],
  )
}

const roleToggleButton = (
  label: string,
  isSelected: boolean,
  onClick: Message,
): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Type('button'),
      h.OnClick(onClick),
      h.AriaPressed(isSelected ? 'true' : 'false'),
      h.Class(
        isSelected
          ? 'cursor-pointer rounded-lg border border-emerald-400/70 bg-emerald-400/15 px-2 py-1.5 text-xs font-semibold text-emerald-100 shadow-sm shadow-emerald-950/20 focus:outline-none focus:ring-2 focus:ring-emerald-300'
          : 'cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400',
      ),
    ],
    [label],
  )
}

const editableActionRoleEditor = (
  status: Workflow.Status,
  action: Workflow.EditableAction,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('grid grid-cols-2 gap-2')],
    Array.map(transitionRoleIds, roleId =>
      roleToggleButton(
        Workflow.roleLabel(roleId),
        Workflow.canRoleEditAction(status.editPolicy, action, roleId),
        ClickedToggledStatusActionRole({
          statusId: status.id,
          action,
          roleId,
        }),
      ),
    ),
  )
}

const editableActionDisclosureRow = (
  model: Model,
  status: Workflow.Status,
  action: Workflow.EditableAction,
): Html => {
  const h = html<Message>()
  const roles = Workflow.rolesForEditableAction(status.editPolicy, action)
  const actionKey = `${status.id}:${action}`
  const isOpen = Array.contains(
    model.workspace.openEditableActionKeys,
    actionKey,
  )

  return h.div(
    [h.Class('rounded-lg border border-slate-800 bg-slate-950/70 p-2')],
    [
      h.details(
        isOpen
          ? [h.Class('group min-w-0'), h.Attribute('open', 'open')]
          : [h.Class('group min-w-0')],
        [
          h.summary(
            [
              h.Attribute('role', 'button'),
              h.OnClick(
                ClickedToggledStatusActionDisclosure({
                  statusId: status.id,
                  action,
                }),
              ),
              h.Class(
                'flex cursor-pointer select-none list-none items-center justify-between gap-3 rounded-md px-2 py-2 text-sm font-semibold text-slate-100 marker:hidden hover:bg-slate-900 focus:outline-none focus:ring-0',
              ),
            ],
            [
              h.span(
                [h.Class('truncate')],
                [Workflow.editableActionLabel(action)],
              ),
              h.span(
                [
                  h.Class(
                    'shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                  ),
                ],
                [`${roles.length} roles`],
              ),
            ],
          ),
          h.div(
            [h.Class('px-2 pb-2 pt-3')],
            [editableActionRoleEditor(status, action)],
          ),
        ],
      ),
    ],
  )
}

const editableActionGroupDisclosure = (
  model: Model,
  status: Workflow.Status,
  group: Workflow.EditableActionGroup,
): Html => {
  const h = html<Message>()

  return h.details(
    [
      h.Class('rounded-lg border border-slate-800 bg-slate-900/70 p-2'),
      h.Attribute('open', 'open'),
    ],
    [
      h.summary(
        [
          h.Class(
            'flex cursor-pointer select-none list-none items-center justify-between gap-3 rounded-md px-2 py-2 text-sm font-semibold text-slate-100 marker:hidden hover:bg-slate-900',
          ),
        ],
        [
          h.span([h.Class('truncate')], [group.title]),
          h.span(
            [
              h.Class(
                'shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
              ),
            ],
            [`${group.actions.length}`],
          ),
        ],
      ),
      h.div(
        [h.Class('mt-2 space-y-2')],
        Array.map(group.actions, action =>
          editableActionDisclosureRow(model, status, action),
        ),
      ),
    ],
  )
}

const editableActionsSection = (
  model: Model,
  status: Workflow.Status,
): Html => {
  const h = html<Message>()
  const disclosure =
    model.editableActionsDisclosure ??
    Disclosure.init({ id: 'editable-actions-disclosure' })
  const editableActionGroups = Workflow.editableActionGroupsForDocumentType(
    model.workspace.workflow.documentType,
  )
  const editableActionCount = Array.reduce(
    editableActionGroups,
    0,
    (count, group) => count + group.actions.length,
  )

  return h.submodel({
    slotId: 'editable-actions-disclosure',
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.section(
          [h.Class('space-y-3')],
          [
            h.button(
              [...attributes.button, h.Class(disclosureButtonClass)],
              [
                h.span([], ['Editable actions']),
                h.span(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          'rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                        ),
                      ],
                      [`${editableActionCount}`],
                    ),
                    chevronIcon(disclosure.isOpen),
                  ],
                ),
              ],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-2')],
                  Array.map(editableActionGroups, group =>
                    editableActionGroupDisclosure(model, status, group),
                  ),
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message =>
      GotEditableActionsDisclosureMessage({ message }),
  })
}

const transitionOrderControls = (
  model: Model,
  transition: Workflow.Transition,
): Html => {
  const h = html<Message>()
  const index = transitionIndex(model.workspace.workflow, transition.id)
  const isFirst = index <= 0
  const isLast = index >= model.workspace.workflow.transitions.length - 1
  const buttonClass =
    'cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-400'

  return h.div(
    [
      h.Class(
        'flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3',
      ),
    ],
    [
      h.div(
        [h.Class('min-w-0')],
        [
          h.div(
            [
              h.Class(
                'text-xs font-medium uppercase tracking-wide text-slate-500',
              ),
            ],
            ['Order'],
          ),
          h.div(
            [h.Class('mt-1 text-sm font-semibold text-slate-100')],
            [index < 0 ? 'Not found' : `Index ${index + 1}`],
          ),
        ],
      ),
      h.div(
        [h.Class('flex shrink-0 items-center gap-2')],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(
                ClickedMovedTransitionEarlier({ transitionId: transition.id }),
              ),
              ...(isFirst ? [h.Disabled(true)] : []),
              h.Class(buttonClass),
            ],
            ['Move up'],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(
                ClickedMovedTransitionLater({ transitionId: transition.id }),
              ),
              ...(isLast ? [h.Disabled(true)] : []),
              h.Class(buttonClass),
            ],
            ['Move down'],
          ),
        ],
      ),
    ],
  )
}

const transitionRoleEditor = (transition: Workflow.Transition): Html => {
  const h = html<Message>()

  if (transition.automationOnly === true) {
    return h.div(
      [h.Class('rounded-xl border border-amber-400/40 bg-amber-400/10 p-3')],
      [
        h.p(
          [h.Class('text-sm font-semibold text-amber-100')],
          ['Automation only'],
        ),
        h.p(
          [h.Class('mt-1 text-xs leading-5 text-amber-200')],
          [
            'Company users cannot execute this transition manually. It is only applied by configured automations.',
          ],
        ),
      ],
    )
  }

  return h.div(
    [h.Class('grid grid-cols-2 gap-2')],
    Array.map(transitionRoleIds, roleId =>
      roleToggleButton(
        Workflow.roleLabel(roleId),
        Array.contains(transition.allowedRoles, roleId),
        ClickedToggledTransitionRole({ transitionId: transition.id, roleId }),
      ),
    ),
  )
}

const transitionAutomationToggle = (transition: Workflow.Transition): Html => {
  const h = html<Message>()
  const isAutomationOnly = transition.automationOnly === true

  return h.label(
    [
      h.Class(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3',
      ),
    ],
    [
      h.input([
        h.Type('checkbox'),
        h.Checked(isAutomationOnly),
        h.OnClick(
          UpdatedTransitionAutomationOnly({
            transitionId: transition.id,
            value: !isAutomationOnly,
          }),
        ),
        h.Class(
          'mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-950',
        ),
      ]),
      h.span(
        [h.Class('min-w-0')],
        [
          h.span(
            [h.Class('block text-sm font-semibold text-slate-100')],
            ['Automation only'],
          ),
          h.span(
            [h.Class('mt-1 block text-xs leading-5 text-slate-500')],
            [
              isAutomationOnly
                ? 'Disable this to allow company users to execute the transition with selected roles.'
                : 'Enable this when the transition should only be applied by configured automations.',
            ],
          ),
        ],
      ),
    ],
  )
}

const transitionAutomationTypeSelect = (
  transition: Workflow.Transition,
): Html => {
  const h = html<Message>()

  if (transition.automationOnly !== true) {
    return h.empty
  }

  const value = transition.automationType ?? 'ORDER_DELIVERY_FULLY_DELIVERED'

  return h.label(
    [h.Class('block rounded-xl border border-slate-800 bg-slate-950/70 p-3')],
    [
      h.div(
        [h.Class('text-xs font-medium uppercase tracking-wide text-slate-500')],
        ['Automation type'],
      ),
      h.select(
        [
          h.Value(value),
          h.OnChange(value =>
            SelectedTransitionAutomationType({
              transitionId: transition.id,
              automationType: transitionAutomationTypeFromValue(value),
            }),
          ),
          h.Class(
            'mt-2 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30',
          ),
        ],
        Array.map(transitionAutomationTypes, automationType =>
          h.option(
            [h.Value(automationType), h.Selected(automationType === value)],
            [transitionAutomationTypeLabel(automationType)],
          ),
        ),
      ),
    ],
  )
}

const transitionEditor = (
  model: Model,
  transition: Workflow.Transition,
): Html => {
  const h = html<Message>()
  const title = statusName(model.workspace.workflow, transition.toStatusId)
  const isOpen = Array.contains(
    model.openNodeTransitionIds ?? [],
    transition.id,
  )
  const disclosure = Disclosure.init({
    id: `node-transition-disclosure-${transition.id}`,
    isOpen,
  })

  return h.submodel({
    slotId: `node-transition-disclosure-${transition.id}`,
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.article(
          [
            h.Class(
              'space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3',
            ),
          ],
          [
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex w-full cursor-pointer select-none items-start justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-900 focus:outline-none focus:ring-0',
                ),
              ],
              [
                h.div(
                  [h.Class('min-w-0')],
                  [
                    h.h3(
                      [
                        h.Class(
                          'truncate text-sm font-semibold text-slate-100',
                        ),
                      ],
                      [title],
                    ),
                    h.p(
                      [h.Class('mt-1 truncate text-xs text-slate-500')],
                      [transition.id],
                    ),
                  ],
                ),
                h.span(
                  [h.Class('flex shrink-0 items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          'rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                        ),
                      ],
                      [
                        transition.automationOnly === true
                          ? 'Automation'
                          : `${transition.allowedRoles.length} roles`,
                      ],
                    ),
                    chevronIcon(disclosure.isOpen),
                  ],
                ),
              ],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-2')],
                  [
                    transitionOrderControls(model, transition),
                    transitionAutomationToggle(transition),
                    transitionAutomationTypeSelect(transition),
                    h.div(
                      [
                        h.Class(
                          'text-xs font-medium uppercase tracking-wide text-slate-500',
                        ),
                      ],
                      ['Allowed roles'],
                    ),
                    transitionRoleEditor(transition),
                    h.div(
                      [h.Class('text-xs text-slate-500')],
                      [`Effects: ${transition.effects.length}`],
                    ),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message =>
      GotNodeTransitionDisclosureMessage({
        transitionId: transition.id,
        message,
      }),
  })
}

const incomingNodeTransitions = (
  model: Model,
  status: Workflow.Status,
): ReadonlyArray<Workflow.Transition> =>
  Array.filter(
    model.workspace.workflow.transitions,
    transition => transition.toStatusId === status.id,
  )

const outgoingNodeTransitions = (
  model: Model,
  status: Workflow.Status,
): ReadonlyArray<Workflow.Transition> =>
  Array.filter(
    model.workspace.workflow.transitions,
    transition => transition.fromStatusId === status.id,
  )

const transitionsDisclosureSection = (
  model: Model,
  status: Workflow.Status,
  label: string,
  emptyMessage: string,
  transitions: ReadonlyArray<Workflow.Transition>,
  disclosure: Disclosure.Model,
  slotId: string,
  toParentMessage: (message: Disclosure.Message) => Message,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId,
    model: disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.section(
          [h.Class('space-y-3')],
          [
            h.button(
              [...attributes.button, h.Class(disclosureButtonClass)],
              [
                h.span([], [label]),
                h.span(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          'rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400',
                        ),
                      ],
                      [`${transitions.length}`],
                    ),
                    chevronIcon(disclosure.isOpen),
                  ],
                ),
              ],
            ),
            disclosure.isOpen
              ? h.div(
                  [...attributes.panel, h.Class('space-y-3')],
                  [
                    Array.match(transitions, {
                      onEmpty: () =>
                        h.div(
                          [
                            h.Class(
                              'rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500',
                            ),
                          ],
                          [emptyMessage],
                        ),
                      onNonEmpty: items =>
                        h.div(
                          [h.Class('space-y-3')],
                          Array.map(items, transition =>
                            transitionEditor(model, transition),
                          ),
                        ),
                    }),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage,
  })
}

const nodeTransitionsDisclosures = (
  model: Model,
  status: Workflow.Status,
): Html => {
  const h = html<Message>()
  const incomingTransitions = incomingNodeTransitions(model, status)
  const outgoingTransitions = outgoingNodeTransitions(model, status)
  const incomingDisclosure =
    model.incomingTransitionsDisclosure ??
    Disclosure.init({ id: 'incoming-transitions-disclosure' })
  const outgoingDisclosure =
    model.outgoingTransitionsDisclosure ??
    Disclosure.init({ id: 'outgoing-transitions-disclosure' })

  return h.div(
    [h.Class('space-y-3')],
    [
      transitionsDisclosureSection(
        model,
        status,
        'Incoming transitions',
        'This node has no incoming transitions.',
        incomingTransitions,
        incomingDisclosure,
        'incoming-transitions-disclosure',
        message => GotIncomingTransitionsDisclosureMessage({ message }),
      ),
      transitionsDisclosureSection(
        model,
        status,
        'Outgoing transitions',
        'This node has no outgoing transitions.',
        outgoingTransitions,
        outgoingDisclosure,
        'outgoing-transitions-disclosure',
        message => GotOutgoingTransitionsDisclosureMessage({ message }),
      ),
    ],
  )
}

const nodePanel = (model: Model): Html => {
  const h = html<Message>()

  return Option.match(selectedStatus(model), {
    onNone: () => h.empty,
    onSome: status => {
      const isInitialStatus =
        status.id === model.workspace.workflow.initialStatusId

      return h.div(
        [
          h.Class(
            'absolute right-4 top-4 z-20 max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))]',
          ),
        ],
        [
          h.aside(
            [
              h.Attribute('aria-label', 'Node properties'),
              h.Class(
                'flex max-h-[calc(100vh-2rem)] cursor-default flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur',
              ),
            ],
            [
              h.div(
                [
                  h.Class(
                    'flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3',
                  ),
                ],
                [
                  h.div(
                    [h.Class('min-w-0')],
                    [
                      h.h2(
                        [
                          h.Class(
                            'truncate text-sm font-semibold text-slate-100',
                          ),
                        ],
                        ['Node properties'],
                      ),
                      h.div(
                        [h.Class('mt-1 truncate text-xs text-slate-500')],
                        [status.id],
                      ),
                    ],
                  ),
                  h.button(
                    [
                      h.Type('button'),
                      h.Attribute('aria-label', 'Close node properties'),
                      h.OnClick(ClickedSelectedWorkflow()),
                      h.Class(
                        'cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400',
                      ),
                    ],
                    ['Close'],
                  ),
                ],
              ),
              h.div(
                [h.Class('space-y-4 overflow-auto p-4')],
                [
                  isInitialStatus
                    ? h.div(
                        [
                          h.Class(
                            'rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sm font-medium text-sky-100',
                          ),
                        ],
                        ['This is the initial node. It cannot be deleted.'],
                      )
                    : h.empty,
                  h.section(
                    [
                      h.Class(
                        'space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3',
                      ),
                    ],
                    [
                      nodePanelIdField(status),
                      nodePanelTextField(status),
                      nodePanelTypeField(status),
                    ],
                  ),
                  editableActionsSection(model, status),
                  nodeTransitionsDisclosures(model, status),
                ],
              ),
            ],
          ),
        ],
      )
    },
  })
}

const zoomControls = (model: Model, size: CanvasSize): Html => {
  const h = html<Message>()
  const centerX = size.width / 2
  const centerY = size.height / 2

  return h.div(
    [
      h.Class(
        'absolute bottom-4 left-4 z-10 flex cursor-default items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/85 p-2 text-sm text-slate-100 shadow-2xl shadow-black/30 backdrop-blur',
      ),
    ],
    [
      h.button(
        [
          h.Type('button'),
          h.Attribute('aria-label', 'Zoom out'),
          h.OnClick(ScrolledCanvas({ deltaY: 1, x: centerX, y: centerY })),
          h.Class(
            'grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-slate-700 bg-slate-900 text-lg leading-none text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400',
          ),
        ],
        ['-'],
      ),
      h.div(
        [
          h.Attribute('aria-label', 'Canvas zoom'),
          h.Class(
            'min-w-14 text-center font-medium tabular-nums text-slate-200',
          ),
        ],
        [`${Math.round(model.workspace.graphZoom * 100)}%`],
      ),
      h.button(
        [
          h.Type('button'),
          h.Attribute('aria-label', 'Zoom in'),
          h.OnClick(ScrolledCanvas({ deltaY: -1, x: centerX, y: centerY })),
          h.Class(
            'grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-slate-700 bg-slate-900 text-lg leading-none text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400',
          ),
        ],
        ['+'],
      ),
    ],
  )
}

const contextMenuButtonClass =
  'w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent'

const contextMenuButton = (
  label: string,
  onClick: Message,
  isDisabled = false,
): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Type('button'),
      h.OnClick(onClick),
      ...(isDisabled ? [h.Disabled(true)] : []),
      h.Class(contextMenuButtonClass),
    ],
    [label],
  )
}

const graphContextMenu = (model: Model): Html => {
  const h = html<Message>()
  const state = model.workspace.graphContextMenuState

  if (state._tag === 'GraphContextMenuClosed') {
    return h.empty
  }

  const children =
    state._tag === 'GraphCanvasContextMenu'
      ? [contextMenuButton('Add node', ClickedAddedStatus())]
      : state._tag === 'GraphNodeContextMenu'
        ? [
            contextMenuButton(
              'Delete node',
              ClickedDeletedStatus({ statusId: state.statusId }),
              state.statusId === model.workspace.workflow.initialStatusId,
            ),
          ]
        : [
            contextMenuButton(
              'Delete edge',
              ClickedDeletedTransition({ transitionId: state.transitionId }),
            ),
          ]

  return h.div(
    [
      h.Attribute('oncontextmenu', 'return false'),
      h.OnContextMenu(SuppressedNativeGraphContextMenu()),
      h.OnClick(ClickedClosedGraphContextMenu()),
      h.Class('fixed inset-0 z-30'),
    ],
    [
      h.div(
        [
          h.Attribute('role', 'menu'),
          h.Style({ left: `${state.clientX}px`, top: `${state.clientY}px` }),
          h.Class(
            'fixed z-30 min-w-44 rounded-xl border border-slate-700 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur',
          ),
        ],
        children,
      ),
    ],
  )
}

const loadingOverlay = (model: Model): Html => {
  const h = html<Message>()

  if (!isLoading(model)) {
    return h.empty
  }

  return h.div(
    [
      h.Attribute('role', 'status'),
      h.Attribute('aria-live', 'polite'),
      h.Class(
        'fixed inset-0 z-50 flex cursor-wait items-center justify-center bg-slate-950/65 text-slate-100 backdrop-blur-sm',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'flex min-w-64 flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-950/95 p-6 shadow-2xl shadow-black/50',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400',
              ),
            ],
            [],
          ),
          h.div(
            [h.Class('text-center')],
            [
              h.div(
                [h.Class('text-sm font-semibold text-slate-100')],
                [loadingMessage(model)],
              ),
              h.div(
                [h.Class('mt-1 text-xs text-slate-500')],
                ['Actions are disabled until this finishes.'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const canvas = (model: Model): Html => {
  const h = html<Message>()
  const isPanning = model.workspace.graphPanState._tag === 'GraphPanning'
  const size = currentCanvasSize()

  return h.main(
    [
      h.Attribute('aria-label', 'Infinite canvas'),
      h.Attribute('aria-busy', isLoading(model) ? 'true' : 'false'),
      h.OnPointerLeave(() =>
        isPanning ? Option.some(ReleasedGraphCanvasPointer()) : Option.none(),
      ),
      h.Style({ touchAction: 'none' }),
      h.Class(
        isPanning
          ? 'relative h-screen overflow-hidden cursor-grabbing bg-slate-950 text-slate-100'
          : 'relative h-screen overflow-hidden cursor-grab bg-slate-950 text-slate-100',
      ),
    ],
    [
      h.div(
        [
          h.Attribute('oncontextmenu', 'return false'),
          h.OnContextMenu(SuppressedNativeGraphContextMenu()),
          h.OnMount(ObserveCanvasWheel()),
          h.OnPointerDown(
            (
              _pointerType,
              button,
              screenX,
              screenY,
              _timeStamp,
              clientX,
              clientY,
            ) =>
              canvasPointerDown(
                model,
                button,
                screenX,
                screenY,
                clientX,
                clientY,
              ),
          ),
          h.Class('absolute inset-0 z-0 select-none'),
        ],
        [graphSvg(model, size)],
      ),
      zoomControls(model, size),
      leftPanel(model),
      nodePanel(model),
      graphContextMenu(model),
      workflowJsonModal(model),
      loadingOverlay(model),
    ],
  )
}

export const view = (model: Model): Document => ({
  title: 'Canvas',
  body: canvas(model),
})
