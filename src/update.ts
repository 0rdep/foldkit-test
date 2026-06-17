import { Disclosure } from '@foldkit/ui'
import { Array, Option } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Graph } from './domain'
import {
  GotEditableActionsDisclosureMessage,
  GotFlowHistoryDisclosureMessage,
  GotNodeTransitionsDisclosureMessage,
  type Message,
} from './message'
import { LeftPanelClosed, LeftPanelOpen, type Model } from './model'
import { Workspace } from './page'

type RootUpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]

const minCanvasZoom = 0.25
const maxCanvasZoom = 4
const canvasZoomStep = 0.1

const initFlowHistoryDisclosure = (): Disclosure.Model =>
  Disclosure.init({ id: 'flow-history-disclosure' })

const initNodeTransitionsDisclosure = (): Disclosure.Model =>
  Disclosure.init({ id: 'node-transitions-disclosure' })

const initEditableActionsDisclosure = (): Disclosure.Model =>
  Disclosure.init({ id: 'editable-actions-disclosure' })

const clampCanvasZoom = (zoom: number): number =>
  Math.min(maxCanvasZoom, Math.max(minCanvasZoom, zoom))

const zoomedPan = (
  pointer: number,
  pan: number,
  currentZoom: number,
  nextZoom: number,
): number => pointer - ((pointer - pan) / currentZoom) * nextZoom

type Point = Readonly<{ x: number; y: number }>

const graphPoint = (model: Model, point: Point): Point => ({
  x: (point.x - model.workspace.graphPanX) / model.workspace.graphZoom,
  y: (point.y - model.workspace.graphPanY) / model.workspace.graphZoom,
})

const canUseInputPin = (node: Graph.GraphNode): boolean =>
  node.status.type !== 'draft'

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

const releasedGraphClientPointerMessage = (
  model: Model,
  point: Point,
): Workspace.Message.Message => {
  if (model.workspace.transitionDragState._tag !== 'TransitionDragging') {
    return Workspace.Message.ReleasedGraphCanvasPointer()
  }

  const layout = Graph.layout(model.workspace.workflow)
  const graphPosition = graphPoint(model, point)

  return Option.match(nodeAtPoint(layout, graphPosition), {
    onNone: () => Workspace.Message.ReleasedGraphCanvasPointer(),
    onSome: node =>
      canDropTransitionOnNode(model, node)
        ? Workspace.Message.ReleasedTransitionInput({
            statusId: node.status.id,
          })
        : Workspace.Message.ReleasedGraphCanvasPointer(),
  })
}

const updateWorkspace = (
  model: Model,
  message: Workspace.Message.Message,
): RootUpdateReturn => {
  const [workspace, commands] = Workspace.update(model.workspace, message)
  const mappedCommands = Command.mapMessages(commands, message => message)

  if (workspace === model.workspace) {
    return [model, mappedCommands]
  }

  return [evo(model, { workspace: () => workspace }), mappedCommands]
}

export const update = (model: Model, message: Message): RootUpdateReturn => {
  if (message._tag === 'ScrolledCanvas') {
    const currentZoom = model.workspace.graphZoom
    const nextZoom = clampCanvasZoom(
      currentZoom + (message.deltaY < 0 ? canvasZoomStep : -canvasZoomStep),
    )

    return [
      evo(model, {
        workspace: workspace =>
          evo(workspace, {
            graphZoom: () => nextZoom,
            graphPanX: panX =>
              zoomedPan(message.x, panX, currentZoom, nextZoom),
            graphPanY: panY =>
              zoomedPan(message.y, panY, currentZoom, nextZoom),
          }),
      }),
      [],
    ]
  }

  if (message._tag === 'MovedGraphClientPointer') {
    return updateWorkspace(
      model,
      Workspace.Message.MovedGraphCanvasPointer({
        screenX: message.x,
        screenY: message.y,
      }),
    )
  }

  if (message._tag === 'ReleasedGraphClientPointer') {
    return updateWorkspace(
      model,
      releasedGraphClientPointerMessage(model, {
        x: message.x,
        y: message.y,
      }),
    )
  }

  if (message._tag === 'ClickedHidLeftPanel') {
    return [evo(model, { leftPanelState: () => LeftPanelClosed() }), []]
  }

  if (message._tag === 'ClickedOpenedLeftPanel') {
    return [evo(model, { leftPanelState: () => LeftPanelOpen() }), []]
  }

  if (message._tag === 'ClickedToggledNodeTransitionDisclosure') {
    return [
      evo(model, {
        openNodeTransitionIds: ids =>
          Array.contains(ids ?? [], message.transitionId)
            ? Array.filter(ids ?? [], id => id !== message.transitionId)
            : [...(ids ?? []), message.transitionId],
      }),
      [],
    ]
  }

  if (message._tag === 'GotFlowHistoryDisclosureMessage') {
    const [flowHistoryDisclosure, commands] = Disclosure.update(
      model.flowHistoryDisclosure ?? initFlowHistoryDisclosure(),
      message.message,
    )

    return [
      evo(model, { flowHistoryDisclosure: () => flowHistoryDisclosure }),
      Command.mapMessages(commands, message =>
        GotFlowHistoryDisclosureMessage({ message }),
      ),
    ]
  }

  if (message._tag === 'GotNodeTransitionsDisclosureMessage') {
    const [nodeTransitionsDisclosure, commands] = Disclosure.update(
      model.nodeTransitionsDisclosure ?? initNodeTransitionsDisclosure(),
      message.message,
    )

    return [
      evo(model, {
        nodeTransitionsDisclosure: () => nodeTransitionsDisclosure,
      }),
      Command.mapMessages(commands, message =>
        GotNodeTransitionsDisclosureMessage({ message }),
      ),
    ]
  }

  if (message._tag === 'GotEditableActionsDisclosureMessage') {
    const [editableActionsDisclosure, commands] = Disclosure.update(
      model.editableActionsDisclosure ?? initEditableActionsDisclosure(),
      message.message,
    )

    return [
      evo(model, {
        editableActionsDisclosure: () => editableActionsDisclosure,
      }),
      Command.mapMessages(commands, message =>
        GotEditableActionsDisclosureMessage({ message }),
      ),
    ]
  }

  if (message._tag === 'GotWorkspaceMessage') {
    return updateWorkspace(model, message.message)
  }

  return updateWorkspace(model, message as Workspace.Message.Message)
}

export const resetModel = (): Model => ({
  workspace: Workspace.resetModel(),
  leftPanelState: LeftPanelOpen(),
  flowHistoryDisclosure: initFlowHistoryDisclosure(),
  nodeTransitionsDisclosure: initNodeTransitionsDisclosure(),
  editableActionsDisclosure: initEditableActionsDisclosure(),
  openNodeTransitionIds: [],
})
