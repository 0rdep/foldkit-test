import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Html, html } from 'foldkit/html'

import { Graph, Workflow } from '../../domain'
import {
  ClickedAddedStatus,
  ClickedAddedApprovalRule,
  ClickedAddedTransition,
  ClickedAddedTransitionEffect,
  ClickedDeletedStatus,
  ClickedDeletedTransition,
  ClickedRemovedApprovalRule,
  ClickedRemovedTransitionEffect,
  ClickedResetGraphViewport,
  ClickedLoadedRemoteFlowDefinitions,
  ClickedPublishedRemoteFlow,
  ClickedSavedRemoteFlowDraft,
  ClickedSavedPreviewLocal,
  ClickedToggledStatusLock,
  ClickedToggledActionMenu,
  ClickedToggledTransitionRole,
  ClickedUndidFlowChanges,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  type Message,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  ReleasedGraphCanvasPointer,
  SelectedStatus,
  SelectedApprovalRuleRole,
  SelectedStatusType,
  SelectedTransition,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  UpdatedStatusName,
  UpdatedApprovalRuleMinAmount,
  UpdatedTransitionLabel,
  UpdatedTransitionSortOrder,
} from './message'
import type { Model } from './model'

const statusTypes: ReadonlyArray<Workflow.StatusType> = [
  'draft',
  'normal',
  'approval',
  'final',
]

const effectTypes: ReadonlyArray<Workflow.EffectType> = [
  'SyncExternalSystem',
  'SendNotification',
  'CreateAuditLog',
  'CallWebhook',
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

const effectTypeFromString = (value: string): Workflow.EffectType => {
  if (value === 'SyncExternalSystem') {
    return 'SyncExternalSystem'
  }
  if (value === 'SendNotification') {
    return 'SendNotification'
  }
  if (value === 'CreateAuditLog') {
    return 'CreateAuditLog'
  }
  return 'CallWebhook'
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

const effectBadgeLabel = (effectType: Workflow.EffectType): string => {
  if (effectType === 'SyncExternalSystem') {
    return 'Sync'
  }
  if (effectType === 'SendNotification') {
    return 'Notify'
  }
  if (effectType === 'CreateAuditLog') {
    return 'Audit'
  }
  return 'Webhook'
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
    'absolute rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    {
      'border-blue-300': node.status.type === 'draft',
      'border-amber-300': node.status.type === 'approval',
      'border-emerald-300': node.status.type === 'final',
      'border-slate-300': node.status.type === 'normal',
      'outline outline-4 outline-offset-2 outline-slate-900': isSelected,
    },
  )
}

const edgeStroke = (edge: Graph.GraphEdge, model: Model): string => {
  if (isSelectedTransition(model, edge.transition.id)) {
    return selectedTransitionStroke
  }
  return transitionStroke
}

const isSelectedTransition = (model: Model, transitionId: string): boolean =>
  model.selectedItemKind === 'Transition' &&
  model.selectedItemId === transitionId

const edgeStrokeWidth = (edge: Graph.GraphEdge, model: Model): string => {
  if (isSelectedTransition(model, edge.transition.id)) {
    return '4'
  }
  return '2'
}

const edgePathElement = (edge: Graph.GraphEdge, model: Model): Html => {
  const h = html<Message>()

  return h.path(
    [
      h.Attribute('d', edge.path),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', edgeStroke(edge, model)),
      h.Attribute('stroke-width', edgeStrokeWidth(edge, model)),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('pointer-events', 'none'),
      h.Attribute(
        'marker-end',
        isSelectedTransition(model, edge.transition.id)
          ? 'url(#arrow-selected)'
          : 'url(#arrow)',
      ),
    ],
    [],
  )
}

const edgeHitPathElement = (edge: Graph.GraphEdge): Html => {
  const h = html<Message>()

  return h.path(
    [
      h.Attribute('d', edge.path),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', 'transparent'),
      h.Attribute('stroke-width', '18'),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('pointer-events', 'stroke'),
      h.Attribute('cursor', 'pointer'),
      h.OnClick(SelectedTransition({ transitionId: edge.transition.id })),
    ],
    [],
  )
}

const selectedEdgeHalo = (edge: Graph.GraphEdge): Html => {
  const h = html<Message>()

  return h.path(
    [
      h.Attribute('d', edge.path),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', selectedTransitionStroke),
      h.Attribute('stroke-width', '12'),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('pointer-events', 'none'),
      h.Attribute('opacity', '0.22'),
    ],
    [],
  )
}

const graphEdges = (
  layout: Graph.GraphLayout,
  model: Model,
): ReadonlyArray<Html> => {
  const h = html<Message>()
  const selectedEdges = Array.filter(layout.edges, edge =>
    isSelectedTransition(model, edge.transition.id),
  )
  const otherEdges = Array.filter(
    layout.edges,
    edge => !isSelectedTransition(model, edge.transition.id),
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
      ],
    ),
    ...Array.map(otherEdges, edge => edgePathElement(edge, model)),
    ...Array.map(selectedEdges, selectedEdgeHalo),
    ...Array.map(selectedEdges, edge => edgePathElement(edge, model)),
    ...Array.map(layout.edges, edgeHitPathElement),
  ]
}

const transitionLabel = (edge: Graph.GraphEdge, model: Model): Html => {
  const h = html<Message>()
  const isSelected = isSelectedTransition(model, edge.transition.id)

  return h.div(
    [
      h.Style({
        position: 'absolute',
        left: `${edge.labelX}px`,
        top: `${edge.labelY}px`,
        transform: 'translate(-50%, -50%)',
        maxWidth: '220px',
      }),
      h.Class('z-20 flex flex-col items-center gap-1'),
    ],
    [
      h.button(
        [
          h.Type('button'),
          h.OnClick(SelectedTransition({ transitionId: edge.transition.id })),
          h.Style(
            isSelected
              ? {
                  borderColor: selectedTransitionStroke,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${selectedTransitionStroke} 25%, transparent)`,
                }
              : {},
          ),
          h.Class(
            clsx(
              'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50',
              { 'shadow-lg': isSelected },
            ),
          ),
        ],
        [edge.transition.label],
      ),
      Array.isReadonlyArrayEmpty(edge.transition.effects)
        ? h.empty
        : h.div(
            [h.Class('flex flex-wrap justify-center gap-1')],
            Array.map(edge.transition.effects, effect =>
              h.span(
                [
                  h.Style(
                    isSelected ? { borderColor: selectedTransitionStroke } : {},
                  ),
                  h.Class(
                    'rounded-full border border-transparent bg-purple-100 px-2 py-1 text-[11px] font-semibold text-purple-800',
                  ),
                ],
                [effectBadgeLabel(effect.type)],
              ),
            ),
          ),
    ],
  )
}

const graphNode = (node: Graph.GraphNode, model: Model): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Type('button'),
      h.OnClick(SelectedStatus({ statusId: node.status.id })),
      h.Style({
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
      }),
      h.Class(nodeClass(node, model)),
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
  )
}

const graphCanvas = (model: Model): Html => {
  const h = html<Message>()
  const layout = Graph.layout(model.workflow)
  const isPanning = model.graphPanState._tag === 'GraphPanning'

  return h.div(
    [
      h.Style({ touchAction: 'none' }),
      h.Class('relative h-full min-h-[32rem] overflow-hidden bg-slate-50'),
    ],
    [
      h.div(
        [
          h.OnPointerDown((_, button, screenX, screenY) => {
            if (button !== 0) {
              return Option.none()
            }
            return Option.some(PressedGraphCanvas({ screenX, screenY }))
          }),
          h.OnPointerMove((screenX, screenY) =>
            isPanning
              ? Option.some(MovedGraphCanvasPointer({ screenX, screenY }))
              : Option.none(),
          ),
          h.OnPointerUp(() =>
            isPanning ? Option.some(ReleasedGraphCanvasPointer()) : Option.none(),
          ),
          h.OnPointerLeave(() =>
            isPanning ? Option.some(ReleasedGraphCanvasPointer()) : Option.none(),
          ),
          h.Style({ touchAction: 'none' }),
          h.Attribute('role', 'region'),
          h.Attribute('aria-label', 'Workflow canvas'),
          h.Class(
            clsx('absolute inset-0 z-10', {
              'cursor-grabbing': isPanning,
              'cursor-grab': !isPanning,
            }),
          ),
        ],
        [
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
              h.svg(
                [
                  h.Attribute('viewBox', `0 0 ${layout.width} ${layout.height}`),
                  h.Style({
                    position: 'absolute',
                    inset: '0',
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    pointerEvents: 'auto',
                  }),
                  h.AriaHidden(true),
                ],
                graphEdges(layout, model),
              ),
              ...Array.map(layout.edges, edge => transitionLabel(edge, model)),
              ...Array.map(layout.nodes, node => graphNode(node, model)),
            ],
          ),
        ],
      ),
      embeddedControls(model),
      dirtyFlowIndicator(model),
      selectedInspectorDrawer(model),
    ],
  )
}

const dirtyFlowIndicator = (model: Model): Html => {
  const h = html<Message>()

  if (!model.isDirty) {
    return h.empty
  }

  return h.div(
    [
      h.Class(
        'absolute right-4 top-4 z-30 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-sm font-medium text-amber-900 shadow-lg backdrop-blur',
      ),
    ],
    [
      h.span([], ['Flow changed']),
      h.button(
        [
          h.Type('button'),
          h.Disabled(Array.isReadonlyArrayEmpty(model.undoStack)),
          h.OnClick(ClickedUndidFlowChanges()),
          h.Class(
            clsx(buttonClass, 'border-amber-300 bg-white px-2 py-1 text-xs'),
          ),
        ],
        ['Undo'],
      ),
    ],
  )
}

const embeddedControls = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('absolute bottom-4 left-4 z-30 flex flex-col items-start gap-2')],
    [
      model.isActionMenuOpen
        ? h.div(
            [
              h.Class(
                'mb-1 grid min-w-56 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur',
              ),
            ],
            [
              h.button(
                [h.Type('button'), h.OnClick(ClickedAddedStatus()), h.Class(buttonClass)],
                ['Add status'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(ClickedAddedTransition()),
                  h.Class(buttonClass),
                ],
                ['Add transition'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(ClickedSavedPreviewLocal()),
                  h.Class(buttonClass),
                ],
                ['Save preview'],
              ),
              model.isPreviewSaved
                ? h.button(
                    [
                      h.Type('button'),
                      h.OnClick(ClickedPublishedRemoteFlow()),
                      h.Class(buttonClass),
                    ],
                    ['Publish'],
                  )
                : h.empty,
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(ClickedLoadedRemoteFlowDefinitions()),
                  h.Class(buttonClass),
                ],
                ['Reload from server'],
              ),
            ],
          )
        : h.empty,
      h.div(
        [
          h.Class(
            'flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur',
          ),
        ],
        [
          h.button(
            [h.Type('button'), h.OnClick(ClickedToggledActionMenu()), h.Class(iconButtonClass)],
            ['Menu'],
          ),
          h.button(
            [h.Type('button'), h.OnClick(ClickedZoomedGraphOut()), h.Class(iconButtonClass)],
            ['-'],
          ),
          h.span(
            [h.Class('min-w-14 text-center text-sm font-semibold text-slate-600')],
            [`${Math.round(model.graphZoom * 100)}%`],
          ),
          h.button(
            [h.Type('button'), h.OnClick(ClickedZoomedGraphIn()), h.Class(iconButtonClass)],
            ['+'],
          ),
          h.button(
            [h.Type('button'), h.OnClick(ClickedResetGraphViewport()), h.Class(buttonClass)],
            ['Reset view'],
          ),
        ],
      ),
    ],
  )
}

const effectsEditor = (transition: Workflow.Transition): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mt-5 space-y-3')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-3')],
        [
          h.h3([h.Class(headingClass)], ['Effect intents']),
          h.select(
            [
              h.Value(''),
              h.OnChange(value =>
                ClickedAddedTransitionEffect({
                  transitionId: transition.id,
                  effectType: effectTypeFromString(value),
                }),
              ),
              h.Class(inputClass),
            ],
            [
              h.option([h.Value('')], ['Add effect intent...']),
              ...Array.map(effectTypes, effectType =>
                h.option(
                  [h.Value(effectType)],
                  [Workflow.effectTypeLabel(effectType)],
                ),
              ),
            ],
          ),
        ],
      ),
      Array.isReadonlyArrayEmpty(transition.effects)
        ? h.p(
            [h.Class('rounded-xl bg-slate-50 p-3 text-sm text-slate-500')],
            ['No side-effect intents declared for this transition.'],
          )
        : h.ul(
            [h.Class('space-y-2')],
            Array.map(transition.effects, effect =>
              h.li(
                [
                  h.Class(
                    'flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3',
                  ),
                ],
                [
                  h.div(
                    [],
                    [
                      h.div(
                        [h.Class('font-medium text-slate-900')],
                        [effect.label],
                      ),
                      h.div([h.Class('text-xs text-slate-500')], [effect.type]),
                    ],
                  ),
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        ClickedRemovedTransitionEffect({
                          transitionId: transition.id,
                          effectId: effect.id,
                        }),
                      ),
                      h.Class(dangerButtonClass),
                    ],
                    ['Remove'],
                  ),
                ],
              ),
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
                ['This is the initial status. It cannot be deleted.'],
              )
            : h.div(
                [h.Class('rounded-xl bg-red-50 p-3 text-sm text-red-800')],
                [
                  'Deleting this node also removes transitions connected to it.',
                ],
              ),
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
                          h.div(
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
                                              h.Selected(roleId === rule.roleId),
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
          h.div(
            [h.Class('mt-5 border-t border-slate-200 pt-5')],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Disabled(status.id === model.workflow.initialStatusId),
                  h.OnClick(ClickedDeletedStatus({ statusId: status.id })),
                  h.Class(
                    clsx(dangerButtonClass, {
                      'cursor-not-allowed opacity-50':
                        status.id === model.workflow.initialStatusId,
                    }),
                  ),
                ],
                ['Delete status'],
              ),
            ],
          ),
        ],
      ),
  })
}

const transitionInspector = (model: Model, transitionId: string): Html => {
  const h = html<Message>()

  return Option.match(Workflow.findTransition(model.workflow, transitionId), {
    onNone: () =>
      h.p([h.Class('text-sm text-slate-500')], ['Transition not found.']),
    onSome: transition =>
      h.div(
        [h.Class('space-y-5')],
        [
          h.div(
            [h.Class('grid gap-4')],
            [
              h.div(
                [h.Class('space-y-2')],
                [
                  h.label(
                    [
                      h.For('transition-label'),
                      h.Class('text-sm font-medium text-slate-700'),
                    ],
                    ['Action label'],
                  ),
                  h.input([
                    h.Id('transition-label'),
                    h.Value(transition.label),
                    h.OnInput(value =>
                      UpdatedTransitionLabel({
                        transitionId: transition.id,
                        value,
                      }),
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
                      h.For('transition-sort-order'),
                      h.Class('text-sm font-medium text-slate-700'),
                    ],
                    ['Sort order'],
                  ),
                  h.input([
                    h.Id('transition-sort-order'),
                    h.Value(transition.sortOrder),
                    h.OnInput(value =>
                      UpdatedTransitionSortOrder({
                        transitionId: transition.id,
                        value,
                      }),
                    ),
                    h.Class(inputClass),
                  ]),
                ],
              ),
              h.div(
                [h.Class('grid gap-4 sm:grid-cols-2')],
                [
                  h.div(
                    [h.Class('space-y-2')],
                    [
                      h.label(
                        [
                          h.For('transition-from'),
                          h.Class('text-sm font-medium text-slate-700'),
                        ],
                        ['From'],
                      ),
                      h.select(
                        [
                          h.Id('transition-from'),
                          h.Value(transition.fromStatusId),
                          h.OnChange(statusId =>
                            SelectedTransitionFromStatus({
                              transitionId: transition.id,
                              statusId,
                            }),
                          ),
                          h.Class(inputClass),
                        ],
                        Array.map(model.workflow.statuses, status =>
                          h.option(
                            [
                              h.Value(status.id),
                              h.Selected(status.id === transition.fromStatusId),
                            ],
                            [status.name],
                          ),
                        ),
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class('space-y-2')],
                    [
                      h.label(
                        [
                          h.For('transition-to'),
                          h.Class('text-sm font-medium text-slate-700'),
                        ],
                        ['To'],
                      ),
                      h.select(
                        [
                          h.Id('transition-to'),
                          h.Value(transition.toStatusId),
                          h.OnChange(statusId =>
                            SelectedTransitionToStatus({
                              transitionId: transition.id,
                              statusId,
                            }),
                          ),
                          h.Class(inputClass),
                        ],
                        Array.map(model.workflow.statuses, status =>
                          h.option(
                            [
                              h.Value(status.id),
                              h.Selected(status.id === transition.toStatusId),
                            ],
                            [status.name],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class('space-y-2')],
                [
                  h.span(
                    [h.Class('text-sm font-medium text-slate-700')],
                    ['Who can execute this transition'],
                  ),
                  h.div(
                    [h.Class('grid gap-2 sm:grid-cols-2')],
                    Array.map(transitionRoleIds, roleId => {
                      const isAllowed = Array.contains(
                        transition.allowedRoles,
                        roleId,
                      )

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
              ),
            ],
          ),
          h.div(
            [h.Class('border-t border-slate-200 pt-5')],
            [
              h.p(
                [h.Class('mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800')],
                ['Deleting this transition removes this action from the flow.'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(
                    ClickedDeletedTransition({ transitionId: transition.id }),
                  ),
                  h.Class(dangerButtonClass),
                ],
                ['Delete transition'],
              ),
            ],
          ),
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
  if (model.selectedItemKind === 'Transition') {
    return h.keyed('div')(
      `transition-inspector-${model.selectedItemId}`,
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
              ['Transition Inspector'],
            ),
            h.p(
              [h.Class('mt-1 text-xs text-slate-500')],
              ['Edit routing, approval rules, and effects.'],
            ),
          ],
        ),
        h.div(
          [h.Class('min-h-0 flex-1 overflow-auto p-4')],
          [transitionInspector(model, model.selectedItemId)],
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
