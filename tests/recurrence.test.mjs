import test from 'node:test'
import assert from 'node:assert/strict'
import { expandSeries, mergeOccurrences } from '../src/lib/recurrence.ts'
import { relocateTask } from '../src/lib/scheduleDrag.ts'

const series = (date, frequency, weekdays = [], until) => ({
  id: 'series', template: { id: 'series', date, title: '반복', completed: false, createdAt: 'now' },
  rule: { frequency, weekdays, until },
})

test('daily recurrence includes boundaries and never precedes start', () => {
  assert.deepEqual(expandSeries(series('2026-10-08', 'daily', [], '2026-10-10'), '2026-10-01', '2026-10-31').map(task => task.date), ['2026-10-08', '2026-10-09', '2026-10-10'])
})
test('weekly weekdays cross year boundary without generating start on wrong weekday', () => {
  assert.deepEqual(expandSeries(series('2026-12-30', 'weekly', [1, 5]), '2026-12-28', '2027-01-04').map(task => task.date), ['2027-01-01', '2027-01-04'])
})
test('monthly uses anchor day after February, including leap year', () => {
  assert.deepEqual(expandSeries(series('2024-01-31', 'monthly'), '2024-01-01', '2024-04-30').map(task => task.date), ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30'])
  assert.deepEqual(expandSeries(series('2025-01-31', 'monthly'), '2025-02-01', '2025-02-28').map(task => task.date), ['2025-02-28'])
})
test('unbounded recurrence generates only requested window with stable identities', () => {
  const s = series('2020-01-01', 'daily')
  const a = expandSeries(s, '2030-01-01', '2030-01-02')
  const b = expandSeries(s, '2030-01-02', '2030-01-03')
  assert.equal(a.length, 2)
  assert.equal(a[1].id, b[0].id)
})
test('completed, moved, deleted occurrences override generation and keep siblings independent', () => {
  const s = series('2026-10-01', 'daily')
  const records = expandSeries(s, '2026-10-01', '2026-10-04')
  const stored = [{ ...records[0], completed: true }, { ...records[1], date: '2026-11-01' }, { ...records[2], deleted: true }]
  const merged = mergeOccurrences(stored, [s], '2026-10-01', '2026-10-04')
  assert.equal(merged.length, 3)
  assert.equal(merged.find(task => task.id === records[0].id).completed, true)
  assert.equal(merged.find(task => task.id === records[1].id).date, '2026-11-01')
  assert.equal(merged.find(task => task.id === records[3].id).completed, false)
})
test('copy of a recurring occurrence becomes standalone; moving retains original identity', () => {
  const task = expandSeries(series('2026-10-01', 'daily'), '2026-10-01', '2026-10-01')[0]
  assert.equal(relocateTask(task, '2026-10-02', false, 'new', 'later').occurrenceDate, '2026-10-01')
  const copy = relocateTask(task, '2026-10-02', true, 'new', 'later')
  assert.equal(copy.seriesId, undefined)
  assert.equal(copy.occurrenceDate, undefined)
})
