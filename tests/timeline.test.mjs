import { test } from 'node:test'
import assert from 'node:assert/strict'
import { timeMinutes, timelineLayout, dragRange } from '../src/lib/timeline.ts'
const item = (id, startTime, endTime) => ({ id, startTime, endTime })

test('drag normalizes both directions and includes the last half-hour slot', () => {
  assert.deepEqual(dragRange(18, 20), { start: '09:00', end: '10:30' })
  assert.deepEqual(dragRange(20, 18), { start: '09:00', end: '10:30' })
  assert.deepEqual(dragRange(47, 47), { start: '23:30', end: '24:00' })
  assert.deepEqual(dragRange(-2, 100), { start: '00:00', end: '24:00' })
})

test('time converts to minutes and untimed tasks stay out of timeline', () => {
  assert.equal(timeMinutes('06:30'), 390)
  assert.deepEqual(timelineLayout([{ id: 'untimed' }]), [])
})

test('overlapping chain shares columns without colliding', () => {
  const layout = timelineLayout([item('a', '09:00', '10:00'), item('b', '09:30', '10:30'), item('c', '10:00', '11:00')])
  assert.deepEqual(layout.map(({ column, columns }) => [column, columns]), [[0, 2], [1, 2], [0, 2]])
})

test('adjacent events are full width and short visual blocks do not overlap', () => {
  assert.deepEqual(timelineLayout([item('a', '09:00', '10:00'), item('b', '10:00', '11:00')]).map((x) => x.columns), [1, 1])
  assert.deepEqual(timelineLayout([item('a', '09:00', '09:05'), item('b', '09:10', '09:20')]).map((x) => x.column), [0, 1])
})

test('invalid end times are excluded while early and late events remain', () => {
  const layout = timelineLayout([item('bad', '10:00', '09:00'), item('early', '01:00', '02:00'), item('late', '23:50', '23:59')])
  assert.deepEqual(layout.map((x) => x.task.id), ['early', 'late'])
})
