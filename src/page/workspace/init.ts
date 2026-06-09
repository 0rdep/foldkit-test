import { Array, Option } from 'effect'

import * as MockBackend from '../../mockBackend'
import { GraphPanIdle, type Model, type SavedWorkspace } from './model'
import { resetModel } from './update'

export const fromSavedWorkspace = ({
  workflow,
  actors,
  documents,
  nextSequence,
}: SavedWorkspace): Model => {
  const selectedStatusId = Option.match(Array.head(workflow.statuses), {
    onNone: () => workflow.initialStatusId,
    onSome: status => status.id,
  })
  const selectedTransitionId = Option.match(Array.head(workflow.transitions), {
    onNone: () => '',
    onSome: transition => transition.id,
  })
  const selectedActorId = Option.match(Array.head(actors), {
    onNone: () => 'pedro',
    onSome: actor => actor.id,
  })
  const selectedDocumentId = Option.match(Array.head(documents), {
    onNone: () => 'req-1001',
    onSome: document => document.id,
  })
  const exchange = MockBackend.exchangeForSelection(
    workflow,
    actors,
    documents,
    selectedActorId,
    selectedDocumentId,
  )

  return {
    workflow,
    actors,
    documents,
    nextSequence,
    selectedStatusId,
    selectedTransitionId,
    selectedItemKind: 'Workflow',
    selectedItemId: '',
    graphPanX: 0,
    graphPanY: 0,
    graphZoom: 1,
    graphPanState: GraphPanIdle(),
    selectedActorId,
    selectedDocumentId,
    lastRequestJson: MockBackend.formatRequest(exchange),
    lastResponseJson: MockBackend.formatResponse(exchange),
    banner: 'Workspace loaded from localStorage',
  }
}

export const init = (
  maybeSavedWorkspace: Option.Option<SavedWorkspace>,
): Model => {
  const model = Option.match(maybeSavedWorkspace, {
    onNone: () => resetModel(),
    onSome: fromSavedWorkspace,
  })

  if (
    Array.isReadonlyArrayEmpty(model.actors) ||
    Array.isReadonlyArrayEmpty(model.documents)
  ) {
    return resetModel()
  }

  return model
}
