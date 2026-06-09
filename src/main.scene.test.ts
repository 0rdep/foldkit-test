import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { defaultModel } from './main'
import { update } from './update'
import { view } from './view/index'

describe('workflow scene', () => {
  test('renders workflow builder sections', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(Scene.role('heading', { name: 'Workflow Map' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Validation' })).toExist(),
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
      Scene.click(Scene.role('button', { name: /Waiting Manager Approval/ })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
    )
  })

  test('closes inspector from empty canvas press', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: /Waiting Manager Approval/ })),
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
      Scene.expect(Scene.text('Waiting Manager Approval')).toExist(),
      Scene.expect(Scene.text('Finance Review')).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Submit for approval' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Run Submit for approval' }),
      ).toBeAbsent(),
    )
  })
})
