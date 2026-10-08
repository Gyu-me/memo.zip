import { test } from 'node:test'
import assert from 'node:assert/strict'
import { movedRange, relocateTask } from '../src/lib/scheduleDrag.ts'

const task = { id: 'original', date: '2026-10-05', completed: true, createdAt: 'old', title: '기록', memo: '메모', categoryId: 'pink', startTime: '09:00', endTime: '10:15' }

test('moving snaps to half-hours while keeping exact duration', () => {
  assert.deepEqual(movedRange('09:00', '10:15', 607), { start: '10:00', end: '11:15' })
  assert.deepEqual(movedRange('09:00', '10:15', -20), { start: '00:00', end: '01:15' })
  assert.deepEqual(movedRange('09:00', '10:15', 1430), { start: '22:30', end: '23:45' })
  assert.equal(movedRange('10:00', '09:00', 600), null)
})

test('move keeps identity, completion, metadata and original object', () => {
  const result = relocateTask(task, '2026-10-06', false, 'unused', 'now', { start: '11:00', end: '12:15' })
  assert.equal(result.id, task.id)
  assert.equal(result.completed, true)
  assert.equal(result.createdAt, 'old')
  assert.equal(result.memo, '메모')
  assert.equal(result.date, '2026-10-06')
  assert.equal(task.date, '2026-10-05')
})

test('copy has a fresh identity and incomplete state; month drop keeps time', () => {
  const result = relocateTask(task, '2026-10-07', true, 'copy', 'now')
  assert.equal(result.id, 'copy')
  assert.equal(result.completed, false)
  assert.equal(result.createdAt, 'now')
  assert.equal(result.startTime, '09:00')
  assert.equal(result.endTime, '10:15')
  assert.equal(task.completed, true)
})
