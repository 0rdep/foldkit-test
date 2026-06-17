import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Disclosure } from '@foldkit/ui'
import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'

import { STORAGE_KEY } from './constant'
import { Message } from './message'
import { LeftPanelOpen, Model } from './model'
import { Workspace } from './page'
import { LoadCompanies, LoadFlowDefinitions } from './page/workspace/command'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// FLAGS

export const Flags = S.Struct({
  maybeSavedWorkspace: S.Option(Workspace.Model.SavedWorkspace),
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* S.decodeEffect(
    S.fromJsonString(Workspace.Model.SavedWorkspace),
  )(json)
  return Flags.make({ maybeSavedWorkspace: Option.some(decoded) })
}).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSavedWorkspace: Option.none() })),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

const targetCompanyIdVariable = (value: string): string | undefined => {
  const companyId = value.trim()

  return companyId === '' ? undefined : companyId
}

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => {
  const workspace = Workspace.init(flags.maybeSavedWorkspace)
  const companyId = targetCompanyIdVariable(workspace.targetCompanyId)
  const pendingOperations =
    companyId === undefined
      ? ['loadCompanies' as const]
      : ['loadCompanies' as const, 'loadFlowDefinitions' as const]
  const flowHistoryDisclosure = Disclosure.init({
    id: 'flow-history-disclosure',
  })
  const automationsDisclosure = Disclosure.init({
    id: 'automations-disclosure',
  })
  const deliveryAutomationDisclosure = Disclosure.init({
    id: 'delivery-automation-disclosure',
  })
  const incomingTransitionsDisclosure = Disclosure.init({
    id: 'incoming-transitions-disclosure',
  })
  const outgoingTransitionsDisclosure = Disclosure.init({
    id: 'outgoing-transitions-disclosure',
  })
  const editableActionsDisclosure = Disclosure.init({
    id: 'editable-actions-disclosure',
  })
  const model = {
    workspace: evo(workspace, {
      pendingOperations: () => pendingOperations,
    }),
    leftPanelState: LeftPanelOpen(),
    automationsDisclosure,
    deliveryAutomationDisclosure,
    flowHistoryDisclosure,
    incomingTransitionsDisclosure,
    outgoingTransitionsDisclosure,
    editableActionsDisclosure,
    openNodeTransitionIds: [],
  }

  if (companyId === undefined) {
    return [model, [LoadCompanies()]]
  }

  return [
    model,
    [
      LoadCompanies(),
      LoadFlowDefinitions({
        documentType: workspace.selectedFlowDocumentType,
        companyId,
      }),
    ],
  ]
}

export const defaultModel = (): Workspace.Model.Model => Workspace.resetModel()

export { Message, Model, subscriptions, update, view }
