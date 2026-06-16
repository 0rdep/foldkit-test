import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { defaultModel } from './main'
import { CompletedSaveWorkspace } from './message'
import { SaveWorkspace } from './page/workspace/command'
import { update } from './update'
import { view } from './view/index'

describe('workflow scene', () => {
  test('renders embedded workflow canvas controls', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(Scene.role('region', { name: 'Workflow canvas' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Menu' })).toBeAbsent(),
      Scene.expect(Scene.role('button', { name: 'Undo' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Apply default flow' }),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Save preview' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Publish' })).toExist(),
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
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Delete status' }),
      ).toBeAbsent(),
      Scene.expect(
        Scene.role('button', { name: 'Create transition from Pending Approval' }),
      ).toExist(),
    )
  })

  test('opens node context menu from right click', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.pointerDown(
        Scene.role('button', { name: 'Select Pending Approval' }),
        {
          button: 2,
          clientX: 320,
          clientY: 180,
        },
      ),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Edit' })).toBeAbsent(),
    )
  })

  test('replaces context menu on second right click', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.pointerDown(
        Scene.role('button', { name: 'Select Pending Approval' }),
        {
          button: 2,
          clientX: 320,
          clientY: 180,
        },
      ),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toExist(),
      Scene.pointerDown(Scene.selector('#workflow-graph-background'), {
        button: 2,
        clientX: 520,
        clientY: 260,
      }),
      Scene.expect(Scene.role('button', { name: 'Add node' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toBeAbsent(),
    )
  })

  test('replaces node context menu with another node menu', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.pointerDown(
        Scene.role('button', { name: 'Select Pending Approval' }),
        {
          button: 2,
          clientX: 320,
          clientY: 180,
        },
      ),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toExist(),
      Scene.pointerDown(Scene.role('button', { name: 'Select Approved' }), {
        button: 2,
        clientX: 520,
        clientY: 260,
      }),
      Scene.expect(Scene.role('button', { name: 'Delete' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Add node' })).toBeAbsent(),
    )
  })

  test('deletes a transition from its context menu', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.pointerDown(
        Scene.selector('#transition-hit-draft-to-pending-approval'),
        {
          button: 2,
          clientX: 420,
          clientY: 220,
        },
      ),
      Scene.expect(Scene.role('menu')).toExist(),
      Scene.click(Scene.role('button', { name: 'Delete' })),
      Scene.Command.expectHas(SaveWorkspace),
      Scene.expect(
        Scene.selector('#transition-hit-draft-to-pending-approval'),
      ).toBeAbsent(),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
    )
  })

  test('creates a transition by dragging between node handles', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(
        Scene.role('button', { name: 'Create transition to Draft' }),
      ).toBeAbsent(),
      Scene.expect(
        Scene.role('button', { name: 'Create transition from Cancelled' }),
      ).toBeAbsent(),
      Scene.pointerDown(
        Scene.role('button', { name: 'Create transition from Approved' }),
      ),
      Scene.pointerUp(
        Scene.role('button', { name: 'Create transition to Rejected' }),
      ),
      Scene.Command.expectHas(SaveWorkspace),
      Scene.expect(
        Scene.role('heading', { name: 'Transition Inspector' }),
      ).toBeAbsent(),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
    )
  })

  test('shows transitions from the status inspector', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.expect(Scene.text('Transitions')).toExist(),
      Scene.expect(Scene.text('Approved')).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Delete transition to Approved' }),
      ).toExist(),
    )
  })

  test('updates behavior on a newly created status', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.pointerDown(Scene.selector('#workflow-graph-background'), {
        button: 2,
        clientX: 320,
        clientY: 240,
      }),
      Scene.click(Scene.role('button', { name: 'Add node' })),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toBeAbsent(),
      Scene.click(Scene.role('button', { name: 'Select New status 100' })),
      Scene.change(Scene.label('Behavior'), 'final'),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
      Scene.expect(Scene.text('Final')).toExist(),
    )
  })

  test('toggles an editable action role from the status inspector', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.click(Scene.role('button', { name: 'Items action roles' })),
      Scene.click(Scene.role('button', { name: 'Items: OrderCreator' })),
      Scene.Command.expectHas(SaveWorkspace),
      Scene.expect(
        Scene.role('button', { name: 'Items: OrderCreator' }),
      ).toHaveAttr('aria-pressed', 'false'),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
    )
  })

  test('closes inspector from empty canvas press', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
      Scene.pointerDown(Scene.selector('#workflow-graph-background')),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
      Scene.pointerUp(Scene.selector('#workflow-graph-background')),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toBeAbsent(),
    )
  })

  test('keeps inspector open when zooming', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.click(Scene.role('button', { name: '+' })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
    )
  })

  test('keeps inspector open when undoing a flow edit', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.click(Scene.role('button', { name: 'Select Pending Approval' })),
      Scene.click(Scene.role('button', { name: 'Items action roles' })),
      Scene.click(Scene.role('button', { name: 'Items: OrderCreator' })),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
      Scene.click(Scene.role('button', { name: 'Undo' })),
      Scene.expect(
        Scene.role('heading', { name: 'Status Inspector' }),
      ).toExist(),
      Scene.Command.resolve(SaveWorkspace, CompletedSaveWorkspace()),
    )
  })

  test('renders sample workflow data', () => {
    Scene.scene(
      { update, view },
      Scene.with(defaultModel()),
      Scene.expect(Scene.text('Pending Approval')).toExist(),
      Scene.expect(Scene.text('Approved')).toExist(),
      Scene.expect(
        Scene.selector('#transition-hit-draft-to-pending-approval'),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Submit for approval' }),
      ).toBeAbsent(),
      Scene.expect(
        Scene.role('button', { name: 'Run Submit for approval' }),
      ).toBeAbsent(),
    )
  })
})
