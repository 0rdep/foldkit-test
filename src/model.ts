import { Schema as S } from 'effect'

import { Workspace } from './page'

export const Model = S.Struct({
  workspace: Workspace.Model.Model,
})

export type Model = typeof Model.Type
