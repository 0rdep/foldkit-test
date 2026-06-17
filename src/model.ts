import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Workspace } from './page'

export const LeftPanelOpen = ts('LeftPanelOpen')
export const LeftPanelClosed = ts('LeftPanelClosed')
export const LeftPanelState = S.Union([LeftPanelOpen, LeftPanelClosed])
export type LeftPanelState = typeof LeftPanelState.Type

export const Model = S.Struct({
  workspace: Workspace.Model.Model,
  leftPanelState: S.optional(LeftPanelState),
  flowHistoryDisclosure: S.optional(Disclosure.Model),
  nodeTransitionsDisclosure: S.optional(Disclosure.Model),
  editableActionsDisclosure: S.optional(Disclosure.Model),
  openNodeTransitionIds: S.optional(S.Array(S.String)),
})

export type Model = typeof Model.Type
