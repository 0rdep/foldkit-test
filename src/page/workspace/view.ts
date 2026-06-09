import clsx from 'clsx'
import { Array, Option, pipe } from 'effect'
import { Html, html } from 'foldkit/html'

import { Graph, Workflow } from '../../domain'
import {
  ClickedAddedApprovalRule,
  ClickedAddedStatus,
  ClickedAddedTransition,
  ClickedAddedTransitionEffect,
  ClickedDeletedStatus,
  ClickedRemovedApprovalRule,
  ClickedRemovedTransitionEffect,
  ClickedResetGraphViewport,
  ClickedResetWorkspace,
  ClickedToggledStatusLock,
  ClickedToggledTransitionApproval,
  ClickedZoomedGraphIn,
  ClickedZoomedGraphOut,
  type Message,
  MovedGraphCanvasPointer,
  PressedGraphCanvas,
  ReleasedGraphCanvasPointer,
  SelectedApprovalRuleRole,
  SelectedStatus,
  SelectedStatusType,
  SelectedTransition,
  SelectedTransitionFromStatus,
  SelectedTransitionToStatus,
  UpdatedApprovalRuleMaxAmount,
  UpdatedApprovalRuleMinAmount,
  UpdatedApprovalRuleRequiredCount,
  UpdatedStatusName,
  UpdatedTransitionLabel,
} from './message'
import type { Model } from './model'

const statusTypes: ReadonlyArray<Workflow.StatusType> = [
  'draft',
  'normal',
  'approvalPending',
  'integration',
  'error',
  'terminal',
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
  if (value === 'approvalPending') {
    return 'approvalPending'
  }
  if (value === 'integration') {
    return 'integration'
  }
  if (value === 'error') {
    return 'error'
  }
  if (value === 'terminal') {
    return 'terminal'
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

const roleIds = (model: Model): ReadonlyArray<string> =>
  pipe(
    model.actors,
    Array.flatMap(actor => actor.roleIds),
    Array.dedupe,
  )

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
          'bg-amber-100 text-amber-800': status.type === 'approvalPending',
          'bg-blue-100 text-blue-800': status.type === 'draft',
          'bg-purple-100 text-purple-800': status.type === 'integration',
          'bg-red-100 text-red-800': status.type === 'error',
          'bg-emerald-100 text-emerald-800': status.type === 'terminal',
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
      'border-amber-300': node.status.type === 'approvalPending',
      'border-purple-300': node.status.type === 'integration',
      'border-red-300': node.status.type === 'error',
      'border-emerald-300': node.status.type === 'terminal',
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

  return panel(
    'Workflow Map',
    'Auto-layout flow visualizer for the workflow definition.',
    [
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          h.p(
            [h.Class('text-xs text-slate-500')],
            [
              'Drag the empty canvas to move the flow. Use zoom controls to inspect dense workflows.',
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(ClickedAddedStatus()),
                  h.Class(buttonClass),
                ],
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
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Style({ touchAction: 'none' }),
          h.Class(
            'relative mt-4 h-[44rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'absolute right-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur',
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
                isPanning
                  ? Option.some(ReleasedGraphCanvasPointer())
                  : Option.none(),
              ),
              h.OnPointerLeave(() =>
                isPanning
                  ? Option.some(ReleasedGraphCanvasPointer())
                  : Option.none(),
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
                      h.Attribute(
                        'viewBox',
                        `0 0 ${layout.width} ${layout.height}`,
                      ),
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
                  ...Array.map(layout.edges, edge =>
                    transitionLabel(edge, model),
                  ),
                  ...Array.map(layout.nodes, node => graphNode(node, model)),
                ],
              ),
            ],
          ),
          selectedInspectorDrawer(model),
        ],
      ),
    ],
  )
}

const approvalRulesEditor = (
  model: Model,
  transition: Workflow.Transition,
): Html => {
  const h = html<Message>()
  const roles = roleIds(model)

  return h.div(
    [h.Class('mt-5 space-y-3')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-3')],
        [
          h.h3([h.Class(headingClass)], ['Approval rules']),
          h.div(
            [h.Class('flex flex-wrap gap-2')],
            Array.map(roles, roleId =>
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(
                    ClickedAddedApprovalRule({
                      transitionId: transition.id,
                      roleId,
                    }),
                  ),
                  h.Class(buttonClass),
                ],
                [`Add ${Workflow.roleLabel(roleId)}`],
              ),
            ),
          ),
        ],
      ),
      Array.isReadonlyArrayEmpty(transition.approvalRules)
        ? h.p(
            [h.Class('rounded-xl bg-slate-50 p-3 text-sm text-slate-500')],
            ['No approval rules yet. Add a role to require approval.'],
          )
        : h.div(
            [h.Class('overflow-hidden rounded-xl border border-slate-200')],
            [
              h.table(
                [h.Class(tableClass)],
                [
                  h.thead(
                    [h.Class(tableHeadClass)],
                    [
                      h.tr(
                        [],
                        [
                          h.th(
                            [h.Scope('col'), h.Class(tableCellClass)],
                            ['Role'],
                          ),
                          h.th(
                            [h.Scope('col'), h.Class(tableCellClass)],
                            ['Min'],
                          ),
                          h.th(
                            [h.Scope('col'), h.Class(tableCellClass)],
                            ['Max'],
                          ),
                          h.th(
                            [h.Scope('col'), h.Class(tableCellClass)],
                            ['Count'],
                          ),
                          h.th([h.Scope('col'), h.Class(tableCellClass)], ['']),
                        ],
                      ),
                    ],
                  ),
                  h.tbody(
                    [h.Class('divide-y divide-slate-200')],
                    Array.map(transition.approvalRules, rule =>
                      h.tr(
                        [],
                        [
                          h.td(
                            [h.Class(tableCellClass)],
                            [
                              h.select(
                                [
                                  h.Value(rule.roleId),
                                  h.OnChange(roleId =>
                                    SelectedApprovalRuleRole({
                                      transitionId: transition.id,
                                      ruleId: rule.id,
                                      roleId,
                                    }),
                                  ),
                                  h.Class(inputClass),
                                ],
                                Array.map(roles, roleId =>
                                  h.option(
                                    [h.Value(roleId)],
                                    [Workflow.roleLabel(roleId)],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          h.td(
                            [h.Class(tableCellClass)],
                            [
                              h.input([
                                h.Type('number'),
                                h.Value(`${rule.minAmount}`),
                                h.OnInput(value =>
                                  UpdatedApprovalRuleMinAmount({
                                    transitionId: transition.id,
                                    ruleId: rule.id,
                                    value,
                                  }),
                                ),
                                h.Class(inputClass),
                              ]),
                            ],
                          ),
                          h.td(
                            [h.Class(tableCellClass)],
                            [
                              h.input([
                                h.Type('number'),
                                h.Value(`${rule.maxAmount}`),
                                h.OnInput(value =>
                                  UpdatedApprovalRuleMaxAmount({
                                    transitionId: transition.id,
                                    ruleId: rule.id,
                                    value,
                                  }),
                                ),
                                h.Class(inputClass),
                              ]),
                            ],
                          ),
                          h.td(
                            [h.Class(tableCellClass)],
                            [
                              h.input([
                                h.Type('number'),
                                h.Value(`${rule.requiredCount}`),
                                h.OnInput(value =>
                                  UpdatedApprovalRuleRequiredCount({
                                    transitionId: transition.id,
                                    ruleId: rule.id,
                                    value,
                                  }),
                                ),
                                h.Class(inputClass),
                              ]),
                            ],
                          ),
                          h.td(
                            [h.Class(tableCellClass)],
                            [
                              h.button(
                                [
                                  h.Type('button'),
                                  h.OnClick(
                                    ClickedRemovedApprovalRule({
                                      transitionId: transition.id,
                                      ruleId: rule.id,
                                    }),
                                  ),
                                  h.Class(dangerButtonClass),
                                ],
                                ['Remove'],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
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
                        [h.Value(statusType)],
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
                          h.option([h.Value(status.id)], [status.name]),
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
                          h.option([h.Value(status.id)], [status.name]),
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
                    ['Approval behavior'],
                  ),
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        ClickedToggledTransitionApproval({
                          transitionId: transition.id,
                        }),
                      ),
                      h.Class(
                        clsx(buttonClass, 'w-full', {
                          'border-amber-200 bg-amber-50 text-amber-800':
                            transition.requiresApproval,
                        }),
                      ),
                    ],
                    [
                      transition.requiresApproval
                        ? 'Requires approval'
                        : 'Direct move',
                    ],
                  ),
                ],
              ),
            ],
          ),
          transition.requiresApproval
            ? approvalRulesEditor(model, transition)
            : h.empty,
          effectsEditor(transition),
        ],
      ),
  })
}

const selectedInspectorDrawer = (model: Model): Html => {
  const h = html<Message>()

  if (model.selectedItemKind === 'Status') {
    return h.div(
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
    return h.div(
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

const graphWorkspace = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('grid gap-6')],
    [graphCanvas(model), validationPanel(model)],
  )
}

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
      [h.Class('min-h-screen bg-slate-100 text-slate-900')],
      [
        h.header(
          [h.Class('border-b border-slate-200 bg-white')],
          [
            h.div(
              [
                h.Class(
                  'mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between',
                ),
              ],
              [
                h.div(
                  [],
                  [
                    h.p(
                      [
                        h.Class(
                          'text-sm font-semibold uppercase tracking-wide text-blue-600',
                        ),
                      ],
                      ['Flow Web'],
                    ),
                    h.h1(
                      [h.Class('mt-1 text-3xl font-bold tracking-tight')],
                      [model.workflow.name],
                    ),
                    h.p(
                      [h.Class('mt-2 max-w-3xl text-sm text-slate-600')],
                      [
                        'Node-based workflow builder for ERP requisition and order status flows.',
                      ],
                    ),
                  ],
                ),
                h.div(
                  [
                    h.Class(
                      'flex flex-col items-start gap-2 sm:flex-row sm:items-center',
                    ),
                  ],
                  [
                    h.span(
                      [
                        h.Class(
                          'rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700',
                        ),
                      ],
                      [
                        `${model.workflow.documentType} v${model.workflow.version}`,
                      ],
                    ),
                    h.button(
                      [
                        h.Type('button'),
                        h.OnClick(ClickedResetWorkspace()),
                        h.Class(buttonClass),
                      ],
                      ['Reset sample'],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        h.main(
          [h.Class('grid w-full gap-6 px-6 py-6')],
          [
            model.banner === ''
              ? h.empty
              : h.div(
                  [
                    h.Class(
                      'rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800',
                    ),
                  ],
                  [model.banner],
                ),
            graphWorkspace(model),
          ],
        ),
      ],
    )
}
