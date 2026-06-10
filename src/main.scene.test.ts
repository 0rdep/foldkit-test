import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { defaultModel } from './main'
import { update } from './update'
import { view } from './view/index'

describe('workflow scene', () => {
  test('renders embedded workflow canvas controls', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(Scene.role('region', { name: 'Workflow canvas' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Menu' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Reset view' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Validation' })).toBeAbsent(),
      Scene.expect(
        Scene.role('heading', { name: 'Workflow Summary' }),
      ).toBeAbsent(),
      Scene.expect(
        Scene.role('heading', { name: 'Mock API Inspector' }),
      ).toBeAbsent(),
      Scene.expect(Scene.role('heading', { name: 'Runtime Log' })).toBeAbsent(),
    )
  })

  test('opens node inspector in the graph canvas', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: /Pending Approval/ })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
    )
  })

  test('closes inspector from empty canvas press', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: /Pending Approval/ })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
      Scene.pointerDown(Scene.role('region', { name: 'Workflow canvas' })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toBeAbsent(),
    )
  })

  test('renders sample workflow data', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(Scene.text('Pending Approval')).toExist(),
      Scene.expect(Scene.text('Approved')).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Submit for approval' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Run Submit for approval' }),
      ).toBeAbsent(),
    )
  })
})
