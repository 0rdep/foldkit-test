import { Option, pipe } from 'effect'

import { Workflow } from './domain'

export type MockExchange = Readonly<{
  method: string
  path: string
  request: unknown
  response: unknown
}>

export type RuntimeStateResponse = Readonly<{
  exchange: MockExchange
  state: Workflow.RuntimeState
}>

export type TransitionResponse = Readonly<{
  exchange: MockExchange
  result: Workflow.TransitionResult
}>

export const formatJson = (value: unknown): string =>
  JSON.stringify(value, null, 2)

export const formatRequest = (exchange: MockExchange): string =>
  formatJson({
    method: exchange.method,
    path: exchange.path,
    body: exchange.request,
  })

export const formatResponse = (exchange: MockExchange): string =>
  formatJson(exchange.response)

export const emptyExchange: MockExchange = {
  method: 'GET',
  path: '/documents/req-1001/workflow-state',
  request: { actorId: 'pedro' },
  response: { status: 'ready' },
}

export const getDocumentWorkflowState = (
  workflow: Workflow.WorkflowDefinition,
  document: Workflow.DocumentInstance,
  actor: Workflow.Actor,
): RuntimeStateResponse => {
  const state = Workflow.runtimeState(workflow, document, actor)
  const exchange = {
    method: 'GET',
    path: `/documents/${document.id}/workflow-state`,
    request: { actorId: actor.id },
    response: state,
  }

  return { exchange, state }
}

export const requestDocumentTransition = (
  workflow: Workflow.WorkflowDefinition,
  document: Workflow.DocumentInstance,
  actor: Workflow.Actor,
  transitionId: string,
  idPrefix: string,
): TransitionResponse => {
  const result = Workflow.requestTransition(
    workflow,
    document,
    actor,
    transitionId,
    idPrefix,
  )
  const exchange = {
    method: 'POST',
    path: `/documents/${document.id}/transitions`,
    request: { actorId: actor.id, transitionId },
    response: {
      result: result.result,
      message: result.message,
      document: result.document,
      emittedEffects: result.emittedEffects,
    },
  }

  return { exchange, result }
}

export const exchangeForSelection = (
  workflow: Workflow.WorkflowDefinition,
  actors: ReadonlyArray<Workflow.Actor>,
  documents: ReadonlyArray<Workflow.DocumentInstance>,
  selectedActorId: string,
  selectedDocumentId: string,
): MockExchange => {
  const maybeActor = Workflow.findActor(actors, selectedActorId)
  const maybeDocument = Workflow.findDocument(documents, selectedDocumentId)

  return pipe(
    Option.all({ actor: maybeActor, document: maybeDocument }),
    Option.match({
      onNone: () => ({
        method: 'GET',
        path: `/documents/${selectedDocumentId}/workflow-state`,
        request: { actorId: selectedActorId },
        response: { error: 'Actor or document not found' },
      }),
      onSome: ({ actor, document }) =>
        getDocumentWorkflowState(workflow, document, actor).exchange,
    }),
  )
}
