import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Html, html } from 'foldkit/html'

import { Graph, Workflow } from '../../domain'
import {
  ClickedAddedApprovalRule,
  ClickedAddedStatus,
  ClickedClosedGraphContextMenu,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedPublishedRemoteFlow,
  ClickedRemovedApprovalRule,
  ClickedResetGraphViewport,
  ClickedSavedPreviewLocal,
  ClickedToggledStatusLock,
  ClickedToggledTransitionRole,
  ClickedUndidFlowChanges,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  type Message,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  PressedGraphCanvasContextMenu,
  PressedGraphNodeContextMenu,
  PressedGraphTransitionContextMenu,
  PressedTransitionOutput,
  ReleasedGraphCanvasPointer,
  ReleasedTransitionInput,
  SelectedApprovalRuleRole,
  SelectedStatus,
  SelectedStatusType,
  SuppressedNativeGraphContextMenu,
  UpdatedApprovalRuleMinAmount,
  UpdatedStatusName,
} from './message'
import type { Model } from './model'

const statusTypes: ReadonlyArray<Workflow.StatusType> = [
  'draft',
  'normal',
  'approval',
  'final',
]

const lockFields: ReadonlyArray<Workflow.LockField> = [
  'addItems',
  'removeItems',
  'changeDeliveryDate',
  'changeAmount',
]

const transitionRoleIds: ReadonlyArray<string> = [
  'SystemAdmin',
  'OrderModerator',
  'OrderModeratorLimited',
  'OrderCreator',
  'CatalogManager',
  'ClientUser',
]

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm'
const headerClass = 'border-b border-slate-200 px-5 py-4'
const headingClass =
  'text-sm font-semibold uppercase tracking-wide text-slate-500'
const tableClass = 'min-w-full divide-y divide-slate-200 text-sm'
const tableHeadClass =
  'bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
const tableCellClass = 'px-4 py-3 align-top'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
const dangerButtonClass =
  'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100'
const iconButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
const transitionStroke = '#94a3b8'
const selectedTransitionStroke = '#FABD00'
const incomingTransitionStroke = '#2563eb'
const outgoingTransitionStroke = '#16a34a'

const statusTypeFromString = (value: string): Workflow.StatusType => {
  if (value === 'draft') {
    return 'draft'
  }
  if (value === 'approval') {
    return 'approval'
  }
  if (value === 'final') {
    return 'final'
  }
  return 'normal'
}

const lockFieldLabel = (field: Workflow.LockField): string => {
  if (field === 'addItems') {
    return 'Add items'
  }
  if (field === 'removeItems') {
    return 'Remove items'
  }
  if (field === 'changeDeliveryDate') {
    return 'Change delivery date'
  }
  return 'Change amount'
}

const approvalAmountRangeLabel = (rule: Workflow.ApprovalRule): string => {
  if (rule.minAmount <= 1) {
    return 'all amounts'
  }
  return `amounts from ${rule.minAmount}`
}

const panel = (
  title: string,
  description: string,
  children: ReadonlyArray<Html>,
) => {
  const h = html<Message>()

  return h.section(
    [h.Class(cardClass)],
    [
      h.div(
        [h.Class(headerClass)],
        [
          h.h2([h.Class('text-lg font-semibold text-slate-950')], [title]),
          h.p([h.Class('mt-1 text-sm text-slate-500')], [description]),
        ],
      ),
      h.div([h.Class('p-5')], children),
    ],
  )
}

const statusBadge = (status: Workflow.Status): Html => {
  const h = html<Message>()

  return h.span(
    [
      h.Class(
        clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', {
          'bg-amber-100 text-amber-800': status.type === 'approval',
          'bg-blue-100 text-blue-800': status.type === 'draft',
          'bg-emerald-100 text-emerald-800': status.type === 'final',
          'bg-slate-100 text-slate-700': status.type === 'normal',
        }),
      ),
    ],
    [Workflow.statusTypeLabel(status.type)],
  )
}

const nodeClass = (node: Graph.GraphNode, model: Model): string => {
  const isSelected =
    model.selectedItemKind === 'Status' &&
    model.selectedItemId === node.status.id

  return clsx(
    'absolute cursor-pointer rounded-2xl border-2 bg-white text-left shadow-sm transition hover:shadow-md',
    isSelected
      ? 'border-slate-900'
      : {
          'border-blue-300': node.status.type === 'draft',
          'border-amber-300': node.status.type === 'approval',
          'border-emerald-300': node.status.type === 'final',
          'border-slate-300': node.status.type === 'normal',
        },
  )
}

const edgeStroke = (edge: Graph.GraphEdge, model: Model): string => {
  if (isSelectedTransition(model, edge.transition.id)) {
    return selectedTransitionStroke
  }
  if (isSelectedStatus(model, edge.transition.fromStatusId)) {
    return outgoingTransitionStroke
  }
  if (isSelectedStatus(model, edge.transition.toStatusId)) {
    return incomingTransitionStroke
  }
  return transitionStroke
}

const isSelectedTransition = (model: Model, transitionId: string): boolean =>
  model.selectedItemKind === 'Transition' &&
  model.selectedItemId === transitionId

const isSelectedStatus = (model: Model, statusId: string): boolean =>
  model.selectedItemKind === 'Status' && model.selectedItemId === statusId

const isHighlightedEdge = (edge: Graph.GraphEdge, model: Model): boolean =>
  isSelectedTransition(model, edge.transition.id) ||
  isSelectedStatus(model, edge.transition.fromStatusId) ||
  isSelectedStatus(model, edge.transition.toStatusId)

const isDraggingTransitionFrom = (model: Model, statusId: string): boolean =>
  model.transitionDragState._tag === 'TransitionDragging' &&
  model.transitionDragState.fromStatusId === statusId

const contextMenuButtonClass =
  'w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent'

const graphContextPointerDown = (clientX: number, clientY: number): Message =>
  PressedGraphCanvasContextMenu({ clientX, clientY })

const transitionContextPointerDown = (
  transitionId: string,
  clientX: number,
  clientY: number,
): Message =>
  PressedGraphTransitionContextMenu({ transitionId, clientX, clientY })

const graphBackgroundPointerDown = (
  button: number,
  screenX: number,
  screenY: number,
  clientX: number,
  clientY: number,
): Option.Option<Message> => {
  if (button === 0) {
    return Option.some(PressedGraphCanvas({ screenX, screenY }))
  }
  if (button === 2) {
    return Option.some(graphContextPointerDown(clientX, clientY))
  }
  return Option.none()
}

const edgeStrokeWidth = '2'

const edgePathElement = (edge: Graph.GraphEdge, model: Model): Html => {
  const h = html<Message>()

  return h.path(
    [
      h.Attribute('d', edge.path),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', edgeStroke(edge, model)),
      h.Attribute('stroke-width', edgeStrokeWidth),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('pointer-events', 'none'),
      h.Attribute(
        'marker-end',
        isSelectedTransition(model, edge.transition.id)
          ? 'url(#arrow-selected)'
          : isSelectedStatus(model, edge.transition.fromStatusId)
            ? 'url(#arrow-outgoing)'
            : isSelectedStatus(model, edge.transition.toStatusId)
              ? 'url(#arrow-incoming)'
              : 'url(#arrow)',
      ),
    ],
    [],
  )
}

const draftTransitionPath = (layout: Graph.GraphLayout, model: Model): Html => {
  const h = html<Message>()

  if (model.transitionDragState._tag !== 'TransitionDragging') {
    return h.empty
  }

  const dragState = model.transitionDragState

  return Option.match(
    Array.findFirst(
      layout.nodes,
      node => node.status.id === dragState.fromStatusId,
    ),
    {
      onNone: () => h.empty,
      onSome: node => {
        const startX = node.x + node.width
        const startY = node.y + node.height / 2
        const endX =
          startX +
          (dragState.currentScreenX - dragState.startScreenX) / model.graphZoom
        const endY =
          startY +
          (dragState.currentScreenY - dragState.startScreenY) / model.graphZoom
        const controlOffset = Math.max(80, Math.abs(endX - startX) * 0.45)

        return h.path(
          [
            h.Attribute(
              'd',
              `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`,
            ),
            h.Attribute('fill', 'none'),
            h.Attribute('stroke', '#2563eb'),
            h.Attribute('stroke-width', '3'),
            h.Attribute('stroke-linecap', 'round'),
            h.Attribute('stroke-dasharray', '8 8'),
            h.Attribute('pointer-events', 'none'),
            h.Attribute('marker-end', 'url(#arrow-draft)'),
          ],
          [],
        )
      },
    },
  )
}

const edgeHitPathElement = (edge: Graph.GraphEdge): Html => {
  const h = html<Message>()

  return h.path(
    [
      h.Id(`transition-hit-${edge.transition.id}`),
      h.Attribute('d', edge.path),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', '#0f172a'),
      h.Attribute('stroke-opacity', '0.001'),
      h.Attribute('stroke-width', '18'),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('pointer-events', 'stroke'),
      h.Attribute('cursor', 'pointer'),
      h.Attribute('oncontextmenu', 'return false'),
      h.OnPointerDown(
        (
          _pointerType,
          button,
          _screenX,
          _screenY,
          _timeStamp,
          clientX,
          clientY,
        ) =>
          button === 2
            ? Option.some(
                transitionContextPointerDown(
                  edge.transition.id,
                  clientX,
                  clientY,
                ),
              )
            : Option.none(),
      ),
      h.OnContextMenu(SuppressedNativeGraphContextMenu()),
    ],
    [],
  )
}

const graphEdges = (
  layout: Graph.GraphLayout,
  model: Model,
): ReadonlyArray<Html> => {
  const h = html<Message>()
  const highlightedEdges = Array.filter(layout.edges, edge =>
    isHighlightedEdge(edge, model),
  )
  const otherEdges = Array.filter(
    layout.edges,
    edge => !isHighlightedEdge(edge, model),
  )

  return [
    h.defs(
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
                h.Attribute('fill', transitionStroke),
              ],
              [],
            ),
          ],
        ),
        h.marker(
          [
            h.Id('arrow-selected'),
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
                h.Attribute('fill', selectedTransitionStroke),
              ],
              [],
            ),
          ],
        ),
        h.marker(
          [
            h.Id('arrow-outgoing'),
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
                h.Attribute('fill', outgoingTransitionStroke),
              ],
              [],
            ),
          ],
        ),
        h.marker(
          [
            h.Id('arrow-incoming'),
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
                h.Attribute('fill', incomingTransitionStroke),
              ],
              [],
            ),
          ],
        ),
        h.marker(
          [
            h.Id('arrow-draft'),
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
                h.Attribute('fill', '#2563eb'),
              ],
              [],
            ),
          ],
        ),
      ],
    ),
    ...Array.map(otherEdges, edge => edgePathElement(edge, model)),
    ...Array.map(highlightedEdges, edge => edgePathElement(edge, model)),
    draftTransitionPath(layout, model),
  ]
}

const graphEdgeHitTargets = (layout: Graph.GraphLayout): ReadonlyArray<Html> =>
  Array.map(layout.edges, edgeHitPathElement)

const transitionInputHandle = (node: Graph.GraphNode, model: Model): Html => {
  const h = html<Message>()

  if (node.status.type === 'draft') {
    return h.empty
  }

  const isActiveDropTarget =
    model.transitionDragState._tag === 'TransitionDragging' &&
    model.transitionDragState.fromStatusId !== node.status.id

  return h.button(
    [
      h.Type('button'),
      h.Attribute('aria-label', `Create transition to ${node.status.name}`),
      h.OnPointerUp(() =>
        model.transitionDragState._tag === 'TransitionDragging'
          ? Option.some(ReleasedTransitionInput({ statusId: node.status.id }))
          : Option.none(),
      ),
      h.Style({ left: '-12px', top: '50%', transform: 'translateY(-50%)' }),
      h.Class(
        clsx(
          'absolute z-0 h-6 w-6 rounded-full border-2 bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
          isActiveDropTarget
            ? 'border-blue-500 ring-4 ring-blue-100'
            : 'border-slate-300 hover:border-blue-400',
        ),
      ),
    ],
    [h.span([h.Class('sr-only')], ['Input'])],
  )
}

const transitionOutputHandle = (node: Graph.GraphNode, model: Model): Html => {
  const h = html<Message>()

  if (node.status.type === 'final') {
    return h.empty
  }

  const isDragging = isDraggingTransitionFrom(model, node.status.id)

  return h.button(
    [
      h.Type('button'),
      h.Attribute('aria-label', `Create transition from ${node.status.name}`),
      h.OnPointerDown((_pointerType, button, screenX, screenY) =>
        button === 0
          ? Option.some(
              PressedTransitionOutput({
                statusId: node.status.id,
                screenX,
                screenY,
              }),
            )
          : Option.none(),
      ),
      h.Style({ right: '-12px', top: '50%', transform: 'translateY(-50%)' }),
      h.Class(
        clsx(
          'absolute z-30 h-6 w-6 rounded-full border-2 bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
          isDragging
            ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
            : 'border-slate-300 hover:border-blue-400',
        ),
      ),
    ],
    [h.span([h.Class('sr-only')], ['Output'])],
  )
}

const graphNode = (node: Graph.GraphNode, model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Style({
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
      }),
      h.Attribute('oncontextmenu', 'return false'),
      h.OnPointerDown(
        (
          _pointerType,
          button,
          _screenX,
          _screenY,
          _timeStamp,
          clientX,
          clientY,
        ) =>
          button === 2
            ? Option.some(
                PressedGraphNodeContextMenu({
                  statusId: node.status.id,
                  clientX,
                  clientY,
                }),
              )
            : Option.none(),
      ),
      h.OnContextMenu(SuppressedNativeGraphContextMenu()),
      h.Class(nodeClass(node, model)),
    ],
    [
      h.button(
        [
          h.Type('button'),
          h.Attribute('aria-label', `Select ${node.status.name}`),
          h.Attribute('oncontextmenu', 'return false'),
          h.OnClick(SelectedStatus({ statusId: node.status.id })),
          h.Style({
            left: '-2px',
            top: '-2px',
            width: 'calc(100% + 4px)',
            height: 'calc(100% + 4px)',
          }),
          h.Class(
            'absolute block rounded-2xl p-[18px] text-left focus:outline-none',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-start justify-between gap-3')],
            [
              h.div(
                [],
                [
                  h.div(
                    [h.Class('text-base font-bold text-slate-950')],
                    [node.status.name],
                  ),
                  h.div([h.Class('mt-1')], [statusBadge(node.status)]),
                ],
              ),
            ],
          ),
        ],
      ),
      transitionOutputHandle(node, model),
    ],
  )
}

const graphNodeInputHandle = (node: Graph.GraphNode, model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Style({
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
      }),
      h.Class('absolute'),
    ],
    [transitionInputHandle(node, model)],
  )
}

const graphCanvas = (model: Model): Html => {
  const h = html<Message>()
  const layout = Graph.layout(model.workflow)
  const isPanning = model.graphPanState._tag === 'GraphPanning'
  const isDraggingTransition =
    model.transitionDragState._tag === 'TransitionDragging'

  return h.div(
    [
      h.Attribute('oncontextmenu', 'return false'),
      h.OnContextMenu(SuppressedNativeGraphContextMenu()),
      h.Style({ touchAction: 'none' }),
      h.Class('relative h-full min-h-[32rem] overflow-hidden bg-slate-50'),
    ],
    [
      h.div(
        [
          h.Attribute('oncontextmenu', 'return false'),
          h.OnContextMenu(SuppressedNativeGraphContextMenu()),
          h.OnPointerMove((screenX, screenY) =>
            isPanning || isDraggingTransition
              ? Option.some(MovedGraphCanvasPointer({ screenX, screenY }))
              : Option.none(),
          ),
          h.OnPointerUp(() =>
            isPanning || isDraggingTransition
              ? Option.some(ReleasedGraphCanvasPointer())
              : Option.none(),
          ),
          h.OnPointerLeave(() =>
            isPanning || isDraggingTransition
              ? Option.some(ReleasedGraphCanvasPointer())
              : Option.none(),
          ),
          h.Style({ touchAction: 'none' }),
          h.Attribute('role', 'region'),
          h.Attribute('aria-label', 'Workflow canvas'),
          h.Class(
            clsx('absolute inset-0 z-10', {
              'cursor-grabbing': isPanning,
              'cursor-crosshair': isDraggingTransition,
              'cursor-grab': !isPanning && !isDraggingTransition,
            }),
          ),
        ],
        [
          h.div(
            [
              h.Id('workflow-graph-background'),
              h.Attribute('aria-label', 'Workflow graph background'),
              h.Attribute('oncontextmenu', 'return false'),
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
                  graphBackgroundPointerDown(
                    button,
                    screenX,
                    screenY,
                    clientX,
                    clientY,
                  ),
              ),
              h.OnContextMenu(SuppressedNativeGraphContextMenu()),
              h.Class('absolute inset-0 z-0'),
            ],
            [],
          ),
          h.div(
            [
              h.Style({
                position: 'relative',
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                transform: `translate(${model.graphPanX}px, ${model.graphPanY}px) scale(${model.graphZoom})`,
                transformOrigin: '0 0',
              }),
              h.Class('z-10'),
            ],
            [
              h.div(
                [
                  h.Attribute('aria-label', 'Workflow graph background'),
                  h.Attribute('oncontextmenu', 'return false'),
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
                      graphBackgroundPointerDown(
                        button,
                        screenX,
                        screenY,
                        clientX,
                        clientY,
                      ),
                  ),
                  h.OnContextMenu(SuppressedNativeGraphContextMenu()),
                  h.Style({ position: 'absolute', inset: '0' }),
                  h.Class('z-0'),
                ],
                [],
              ),
              h.svg(
                [
                  h.Attribute(
                    'viewBox',
                    `0 0 ${layout.width} ${layout.height}`,
                  ),
                  h.Attribute('oncontextmenu', 'return false'),
                  h.OnContextMenu(SuppressedNativeGraphContextMenu()),
                  h.Style({
                    position: 'absolute',
                    inset: '0',
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    pointerEvents: 'none',
                  }),
                  h.AriaHidden(true),
                ],
                graphEdgeHitTargets(layout),
              ),
              ...Array.map(layout.nodes, node =>
                graphNodeInputHandle(node, model),
              ),
              h.svg(
                [
                  h.Attribute(
                    'viewBox',
                    `0 0 ${layout.width} ${layout.height}`,
                  ),
                  h.Attribute('oncontextmenu', 'return false'),
                  h.OnContextMenu(SuppressedNativeGraphContextMenu()),
                  h.Style({
                    position: 'absolute',
                    inset: '0',
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    pointerEvents: 'none',
                  }),
                  h.AriaHidden(true),
                ],
                graphEdges(layout, model),
              ),
              ...Array.map(layout.nodes, node => graphNode(node, model)),
            ],
          ),
        ],
      ),
      embeddedControls(model),
      graphActions(model),
      graphContextMenu(model),
      selectedInspectorDrawer(model),
    ],
  )
}

const graphActions = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'absolute right-4 top-4 z-30 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur',
      ),
    ],
    [
      model.isDirty
        ? h.span(
            [h.Class('px-2 text-sm font-medium text-amber-800')],
            ['Flow changed'],
          )
        : h.empty,
      h.button(
        [
          h.Type('button'),
          h.Disabled(Array.isReadonlyArrayEmpty(model.undoStack)),
          h.OnClick(ClickedUndidFlowChanges()),
          h.Class(
            clsx(buttonClass, {
              'cursor-not-allowed opacity-50': Array.isReadonlyArrayEmpty(
                model.undoStack,
              ),
            }),
          ),
        ],
        ['Undo'],
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(ClickedSavedPreviewLocal()),
          h.Class(buttonClass),
        ],
        ['Save preview'],
      ),
      h.button(
        [
          h.Type('button'),
          h.Disabled(!model.isPreviewSaved),
          h.OnClick(ClickedPublishedRemoteFlow()),
          h.Class(
            clsx(buttonClass, {
              'cursor-not-allowed opacity-50': !model.isPreviewSaved,
            }),
          ),
        ],
        ['Publish'],
      ),
    ],
  )
}

const graphContextMenu = (model: Model): Html => {
  const h = html<Message>()
  const menuClass =
    'fixed z-50 min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl'

  if (model.graphContextMenuState._tag === 'GraphCanvasContextMenu') {
    return h.div(
      [
        h.Id('graph-context-menu-overlay'),
        h.Attribute('oncontextmenu', 'return false'),
        h.OnContextMenu(SuppressedNativeGraphContextMenu()),
        h.OnPointerDown(
          (
            _pointerType,
            button,
            _screenX,
            _screenY,
            _timeStamp,
            clientX,
            clientY,
          ) =>
            button === 2
              ? Option.some(graphContextPointerDown(clientX, clientY))
              : Option.none(),
        ),
        h.OnClick(ClickedClosedGraphContextMenu()),
        h.Class('pointer-events-none fixed inset-0 z-40'),
      ],
      [
        h.div(
          [
            h.Attribute('role', 'menu'),
            h.Attribute('oncontextmenu', 'return false'),
            h.OnContextMenu(SuppressedNativeGraphContextMenu()),
            h.Style({
              left: `${model.graphContextMenuState.clientX}px`,
              top: `${model.graphContextMenuState.clientY}px`,
            }),
            h.Class(clsx(menuClass, 'pointer-events-auto')),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.OnClick(ClickedAddedStatus()),
                h.Class(contextMenuButtonClass),
              ],
              ['Add node'],
            ),
          ],
        ),
      ],
    )
  }

  if (model.graphContextMenuState._tag === 'GraphNodeContextMenu') {
    const menuState = model.graphContextMenuState
    const isInitialStatus =
      menuState.statusId === model.workflow.initialStatusId

    return h.div(
      [
        h.Id('graph-context-menu-overlay'),
        h.Attribute('oncontextmenu', 'return false'),
        h.OnContextMenu(SuppressedNativeGraphContextMenu()),
        h.OnPointerDown(
          (
            _pointerType,
            button,
            _screenX,
            _screenY,
            _timeStamp,
            clientX,
            clientY,
          ) =>
            button === 2
              ? Option.some(graphContextPointerDown(clientX, clientY))
              : Option.none(),
        ),
        h.OnClick(ClickedClosedGraphContextMenu()),
        h.Class('pointer-events-none fixed inset-0 z-40'),
      ],
      [
        h.div(
          [
            h.Attribute('role', 'menu'),
            h.Attribute('oncontextmenu', 'return false'),
            h.OnContextMenu(SuppressedNativeGraphContextMenu()),
            h.Style({
              left: `${menuState.clientX}px`,
              top: `${menuState.clientY}px`,
            }),
            h.Class(clsx(menuClass, 'pointer-events-auto')),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.Disabled(isInitialStatus),
                h.OnClick(
                  ClickedDeletedStatus({ statusId: menuState.statusId }),
                ),
                h.Class(
                  clsx(contextMenuButtonClass, 'text-red-700', {
                    'text-slate-400': isInitialStatus,
                  }),
                ),
              ],
              ['Delete'],
            ),
          ],
        ),
      ],
    )
  }

  if (model.graphContextMenuState._tag === 'GraphTransitionContextMenu') {
    const menuState = model.graphContextMenuState

    return h.div(
      [
        h.Id('graph-context-menu-overlay'),
        h.Attribute('oncontextmenu', 'return false'),
        h.OnContextMenu(SuppressedNativeGraphContextMenu()),
        h.OnPointerDown(
          (
            _pointerType,
            button,
            _screenX,
            _screenY,
            _timeStamp,
            clientX,
            clientY,
          ) =>
            button === 2
              ? Option.some(graphContextPointerDown(clientX, clientY))
              : Option.none(),
        ),
        h.OnClick(ClickedClosedGraphContextMenu()),
        h.Class('pointer-events-none fixed inset-0 z-40'),
      ],
      [
        h.div(
          [
            h.Attribute('role', 'menu'),
            h.Attribute('oncontextmenu', 'return false'),
            h.OnContextMenu(SuppressedNativeGraphContextMenu()),
            h.Style({
              left: `${menuState.clientX}px`,
              top: `${menuState.clientY}px`,
            }),
            h.Class(clsx(menuClass, 'pointer-events-auto')),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.OnClick(
                  ClickedDeletedTransition({
                    transitionId: menuState.transitionId,
                  }),
                ),
                h.Class(clsx(contextMenuButtonClass, 'text-red-700')),
              ],
              ['Delete'],
            ),
          ],
        ),
      ],
    )
  }

  return h.empty
}

const embeddedControls = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('absolute bottom-4 left-4 z-30')],
    [
      h.div(
        [
          h.Class(
            'flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur',
          ),
        ],
        [
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedZoomedGraphOut()),
              h.Class(iconButtonClass),
            ],
            ['-'],
          ),
          h.span(
            [
              h.Class(
                'min-w-14 text-center text-sm font-semibold text-slate-600',
              ),
            ],
            [`${Math.round(model.graphZoom * 100)}%`],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedZoomedGraphIn()),
              h.Class(iconButtonClass),
            ],
            ['+'],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(ClickedResetGraphViewport()),
              h.Class(buttonClass),
            ],
            ['Reset view'],
          ),
        ],
      ),
    ],
  )
}

const transitionTargetName = (
  workflow: Workflow.WorkflowDefinition,
  transition: Workflow.Transition,
): string =>
  Option.match(Workflow.findStatus(workflow, transition.toStatusId), {
    onNone: () => transition.toStatusId,
    onSome: status => status.name,
  })

const trashIcon = (): Html => {
  const h = html<Message>()

  return h.svg(
    [
      h.Attribute('viewBox', '0 0 24 24'),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', 'currentColor'),
      h.Attribute('stroke-width', '1.8'),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('aria-hidden', 'true'),
      h.Class('h-4 w-4'),
    ],
    [
      h.path([h.Attribute('d', 'M 4 7h16')], []),
      h.path([h.Attribute('d', 'M 10 11v6')], []),
      h.path([h.Attribute('d', 'M 14 11v6')], []),
      h.path([h.Attribute('d', 'M 6 7l1 14h10l1-14')], []),
      h.path([h.Attribute('d', 'M 9 7V4h6v3')], []),
    ],
  )
}

const transitionRoleEditor = (transition: Workflow.Transition): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('space-y-2')],
    [
      h.span(
        [h.Class('text-sm font-medium text-slate-700')],
        ['Who can execute this transaction'],
      ),
      h.div(
        [h.Class('grid gap-2 sm:grid-cols-2')],
        Array.map(transitionRoleIds, roleId => {
          const isAllowed = Array.contains(transition.allowedRoles, roleId)

          return h.button(
            [
              h.Type('button'),
              h.OnClick(
                ClickedToggledTransitionRole({
                  transitionId: transition.id,
                  roleId,
                }),
              ),
              h.AriaPressed(isAllowed ? 'true' : 'false'),
              h.Style(
                isAllowed
                  ? {
                      backgroundColor: '#dcfce7',
                      borderColor: '#86efac',
                      color: '#166534',
                    }
                  : {
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      color: '#475569',
                    },
              ),
              h.Class(
                clsx(buttonClass, {
                  'shadow-sm ring-2 ring-green-200': isAllowed,
                }),
              ),
            ],
            [Workflow.roleLabel(roleId)],
          )
        }),
      ),
    ],
  )
}

const transitionDisclosureRow = (
  workflow: Workflow.WorkflowDefinition,
  transition: Workflow.Transition,
): Html => {
  const h = html<Message>()
  const targetName = transitionTargetName(workflow, transition)

  return h.div(
    [
      h.Class(
        'flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2',
      ),
    ],
    [
      h.details(
        [h.Class('group min-w-0 flex-1')],
        [
          h.summary(
            [
              h.Class(
                'flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-slate-900 marker:hidden hover:bg-slate-50',
              ),
            ],
            [
              h.span([h.Class('truncate')], [`-> ${targetName}`]),
              h.span(
                [
                  h.Class(
                    'shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500',
                  ),
                ],
                [`${transition.allowedRoles.length} roles`],
              ),
            ],
          ),
          h.div(
            [h.Class('px-2 pb-2 pt-3')],
            [transitionRoleEditor(transition)],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.Attribute('aria-label', `Delete transition to ${targetName}`),
          h.OnClick(ClickedDeletedTransition({ transitionId: transition.id })),
          h.Class(
            'mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100',
          ),
        ],
        [trashIcon()],
      ),
    ],
  )
}

const statusTransitionsSection = (
  model: Model,
  status: Workflow.Status,
): Html => {
  const h = html<Message>()
  const outgoingTransitions = Array.filter(
    model.workflow.transitions,
    transition => transition.fromStatusId === status.id,
  )

  return h.div(
    [h.Class('mt-5')],
    [
      h.h3([h.Class(headingClass)], ['Transitions']),
      Array.isReadonlyArrayEmpty(outgoingTransitions)
        ? h.p(
            [h.Class('mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500')],
            ['This node has no outgoing transitions.'],
          )
        : h.div(
            [h.Class('mt-3 space-y-2')],
            Array.map(outgoingTransitions, transition =>
              transitionDisclosureRow(model.workflow, transition),
            ),
          ),
    ],
  )
}

const statusInspector = (model: Model, statusId: string): Html => {
  const h = html<Message>()

  return Option.match(Workflow.findStatus(model.workflow, statusId), {
    onNone: () =>
      h.p([h.Class('text-sm text-slate-500')], ['Status not found.']),
    onSome: status =>
      h.div(
        [h.Class('space-y-5')],
        [
          status.id === model.workflow.initialStatusId
            ? h.div(
                [
                  h.Class(
                    'rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-800',
                  ),
                ],
                ['This is the initial status.'],
              )
            : h.empty,
          h.div(
            [h.Class('grid gap-4')],
            [
              h.div(
                [h.Class('space-y-2')],
                [
                  h.label(
                    [
                      h.For('status-name'),
                      h.Class('text-sm font-medium text-slate-700'),
                    ],
                    ['Status name'],
                  ),
                  h.input([
                    h.Key(`status-name-${status.id}`),
                    h.Id('status-name'),
                    h.Value(status.name),
                    h.OnInput(value =>
                      UpdatedStatusName({ statusId: status.id, value }),
                    ),
                    h.Class(inputClass),
                  ]),
                ],
              ),
              h.div(
                [h.Class('space-y-2')],
                [
                  h.label(
                    [
                      h.For('status-type'),
                      h.Class('text-sm font-medium text-slate-700'),
                    ],
                    ['Behavior'],
                  ),
                  h.select(
                    [
                      h.Key(`status-type-${status.id}`),
                      h.Id('status-type'),
                      h.Value(status.type),
                      h.OnChange(value =>
                        SelectedStatusType({
                          statusId: status.id,
                          value: statusTypeFromString(value),
                        }),
                      ),
                      h.Class(inputClass),
                    ],
                    Array.map(statusTypes, statusType =>
                      h.option(
                        [
                          h.Value(statusType),
                          h.Selected(statusType === status.type),
                        ],
                        [Workflow.statusTypeLabel(statusType)],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('mt-5')],
            [
              h.h3([h.Class(headingClass)], ['Edit locks']),
              h.div(
                [h.Class('mt-3 grid gap-2')],
                Array.map(lockFields, field => {
                  const isAllowed = status.editPolicy[field]
                  return h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        ClickedToggledStatusLock({
                          statusId: status.id,
                          field,
                        }),
                      ),
                      h.Class(
                        clsx(buttonClass, {
                          'border-emerald-200 bg-emerald-50 text-emerald-700':
                            isAllowed,
                          'border-red-200 bg-red-50 text-red-700': !isAllowed,
                        }),
                      ),
                    ],
                    [
                      `${lockFieldLabel(field)}: ${isAllowed ? 'Allowed' : 'Blocked'}`,
                    ],
                  )
                }),
              ),
            ],
          ),
          statusTransitionsSection(model, status),
          status.type === 'approval'
            ? h.div(
                [h.Class('mt-5')],
                [
                  h.div(
                    [h.Class('flex items-center justify-between gap-3')],
                    [
                      h.h3([h.Class(headingClass)], ['Approval rules']),
                      h.button(
                        [
                          h.Type('button'),
                          h.OnClick(
                            ClickedAddedApprovalRule({ statusId: status.id }),
                          ),
                          h.Class(buttonClass),
                        ],
                        ['Add rule'],
                      ),
                    ],
                  ),
                  status.approval === undefined
                    ? h.p(
                        [
                          h.Class(
                            'mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800',
                          ),
                        ],
                        ['This approval status has no approval rules yet.'],
                      )
                    : h.div(
                        [h.Class('mt-3 space-y-3')],
                        Array.map(status.approval.rules, rule =>
                          h.keyed('div')(
                            `approval-rule-${status.id}-${rule.id}`,
                            [
                              h.Class(
                                'rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700',
                              ),
                            ],
                            [
                              h.div(
                                [h.Class('font-medium text-slate-900')],
                                [
                                  `${Workflow.roleLabel(rule.roleId)} approves ${approvalAmountRangeLabel(rule)}`,
                                ],
                              ),
                              h.div(
                                [h.Class('mt-3 grid gap-3 sm:grid-cols-2')],
                                [
                                  h.div(
                                    [h.Class('space-y-1')],
                                    [
                                      h.label(
                                        [
                                          h.For(`approval-role-${rule.id}`),
                                          h.Class(
                                            'text-xs font-medium text-slate-600',
                                          ),
                                        ],
                                        ['Approver role'],
                                      ),
                                      h.select(
                                        [
                                          h.Id(`approval-role-${rule.id}`),
                                          h.Value(rule.roleId),
                                          h.OnChange(roleId =>
                                            SelectedApprovalRuleRole({
                                              statusId: status.id,
                                              ruleId: rule.id,
                                              roleId,
                                            }),
                                          ),
                                          h.Class(inputClass),
                                        ],
                                        Array.map(transitionRoleIds, roleId =>
                                          h.option(
                                            [
                                              h.Value(roleId),
                                              h.Selected(
                                                roleId === rule.roleId,
                                              ),
                                            ],
                                            [Workflow.roleLabel(roleId)],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  h.div(
                                    [h.Class('space-y-1')],
                                    [
                                      h.label(
                                        [
                                          h.For(`approval-min-${rule.id}`),
                                          h.Class(
                                            'text-xs font-medium text-slate-600',
                                          ),
                                        ],
                                        ['Min amount'],
                                      ),
                                      h.input([
                                        h.Id(`approval-min-${rule.id}`),
                                        h.Type('number'),
                                        h.Attribute('min', '1'),
                                        h.Value(`${rule.minAmount}`),
                                        h.OnInput(value =>
                                          UpdatedApprovalRuleMinAmount({
                                            statusId: status.id,
                                            ruleId: rule.id,
                                            value,
                                          }),
                                        ),
                                        h.Class(inputClass),
                                      ]),
                                    ],
                                  ),
                                ],
                              ),
                              h.button(
                                [
                                  h.Type('button'),
                                  h.OnClick(
                                    ClickedRemovedApprovalRule({
                                      statusId: status.id,
                                      ruleId: rule.id,
                                    }),
                                  ),
                                  h.Class(clsx(dangerButtonClass, 'mt-3')),
                                ],
                                ['Remove rule'],
                              ),
                            ],
                          ),
                        ),
                      ),
                ],
              )
            : h.empty,
        ],
      ),
  })
}

const selectedInspectorDrawer = (model: Model): Html => {
  const h = html<Message>()

  if (model.selectedItemKind === 'Status') {
    return h.keyed('div')(
      `status-inspector-${model.selectedItemId}`,
      [
        h.Class(
          'absolute bottom-4 right-4 top-20 z-40 flex w-[min(28rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
        ),
      ],
      [
        h.div(
          [h.Class('border-b border-slate-200 px-4 py-3')],
          [
            h.h3(
              [h.Class('text-base font-semibold text-slate-950')],
              ['Status Inspector'],
            ),
            h.p(
              [h.Class('mt-1 text-xs text-slate-500')],
              ['Edit the selected node behavior and locks.'],
            ),
          ],
        ),
        h.div(
          [h.Class('min-h-0 flex-1 overflow-auto p-4')],
          [statusInspector(model, model.selectedItemId)],
        ),
      ],
    )
  }
  return h.empty
}

const validationPanel = (model: Model): Html => {
  const h = html<Message>()
  const warnings = Workflow.validateWorkflow(model.workflow)

  return panel('Validation', 'Fast feedback before a workflow is published.', [
    Array.isReadonlyArrayEmpty(warnings)
      ? h.div(
          [
            h.Class(
              'rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700',
            ),
          ],
          ['No workflow validation warnings.'],
        )
      : h.ul(
          [h.Class('space-y-2')],
          Array.map(warnings, warning =>
            h.li(
              [h.Class('rounded-xl bg-amber-50 p-3 text-sm text-amber-800')],
              [warning],
            ),
          ),
        ),
  ])
}

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('h-screen min-h-[32rem] bg-slate-50 text-slate-900')],
    [graphCanvas(model)],
  )
}
