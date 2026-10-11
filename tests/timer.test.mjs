import test from 'node:test'
import assert from 'node:assert/strict'
import { elapsedTime, pauseTimer, resumeTimer, formatDuration } from '../src/lib/timer.ts'
const timer = { id: 'active', sessionId: 'one', title: '작업', date: '2026-10-11', startedAt: 1000, runningSince: 1000, elapsedMs: 0 }
test('elapsed calculation recovers real time after reload or delayed ticks', () => {
  assert.equal(elapsedTime(timer, 91000), 90000)
  assert.equal(elapsedTime(timer, 900), 0)
})
test('pause excludes rest and resume preserves accumulated work without duplicate starts', () => {
  const paused = pauseTimer(timer, 31000)
  assert.equal(elapsedTime(paused, 100000), 30000)
  assert.deepEqual(pauseTimer(paused, 100000), paused)
  const resumed = resumeTimer(paused, 101000)
  assert.equal(elapsedTime(resumed, 111000), 40000)
  assert.deepEqual(resumeTimer(resumed, 105000), resumed)
  assert.equal(timer.elapsedMs, 0)
})
test('duration formats hours beyond one day without wrapping', () => {
  assert.equal(formatDuration(90061999), '25:01:01')
  assert.equal(formatDuration(-100), '00:00:00')
})
