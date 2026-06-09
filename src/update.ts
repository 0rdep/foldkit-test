import { Match as M } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { type Message } from './message'
import type { Model } from './model'
import { Workspace } from './page'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const updateWorkspace = (
  model: Model,
  message: Workspace.Message.Message,
): UpdateReturn => {
  const [workspace, commands] = Workspace.update(model.workspace, message)
  if (workspace === model.workspace) {
    return [model, commands]
  }

  return [evo(model, { workspace: () => workspace }), commands]
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tag('GotWorkspaceMessage', ({ message }) =>
      updateWorkspace(model, message),
    ),
    M.orElse(message => updateWorkspace(model, message)),
  )

export const resetModel = (): Model => ({ workspace: Workspace.resetModel() })
