import { Subscription } from 'foldkit'

import type { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(() => ({}))
