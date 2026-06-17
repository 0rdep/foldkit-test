import { Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    Message,
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
  },
})

Runtime.run(application)
