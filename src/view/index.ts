import { type Document } from 'foldkit/html'

import type { Model } from '../model'
import { Workspace } from '../page'

export const view = (model: Model): Document => ({
  title: 'Flow Web',
  body: Workspace.view(model.workspace),
})
