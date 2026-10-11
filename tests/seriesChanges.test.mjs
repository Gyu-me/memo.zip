import test from 'node:test'
import assert from 'node:assert/strict'
import { planSeriesChange, seriesGroup } from '../src/lib/seriesChanges.ts'
import { expandSeries, mergeOccurrences } from '../src/lib/recurrence.ts'

const base = { id: 'a', template: { id: 'a', title: 'old', date: '2026-10-01', completed: false, createdAt: 'now' }, rule: { frequency: 'daily', weekdays: [], until: '2026-10-10' } }
const replacement = { id: 'b', template: { ...base.template, title: 'new', date: '2026-10-05' }, rule: { ...base.rule } }
const apply = (group, stored, plan) => ({
  group: [...group.filter(item => !plan.removeSeries.includes(item.id) && !plan.putSeries.some(next => next.id === item.id)), ...plan.putSeries],
  stored: [...stored.filter(item => !plan.removeTasks.includes(item.id)), ...plan.putTasks],
})

test('following edit preserves earlier rules and exceptions while replacing future', () => {
  const records = expandSeries(base, '2026-10-01', '2026-10-10')
  const stored = [{ ...records[0], completed: true }, { ...records[5], title: 'exception' }]
  const plan = planSeriesChange([base], stored, '2026-10-05', replacement)
  const next = apply([base], stored, plan)
  const tasks = mergeOccurrences(next.stored, next.group, '2026-10-01', '2026-10-10')
  assert.equal(tasks.length, 10)
  assert.equal(tasks.find(task => task.date === '2026-10-01').completed, true)
  assert.equal(tasks.find(task => task.date === '2026-10-04').title, 'old')
  assert.equal(tasks.find(task => task.date === '2026-10-05').title, 'new')
  assert.equal(tasks.find(task => task.date === '2026-10-06').title, 'new')
  assert.equal(next.group[0].rule.until, '2026-10-04')
  assert.equal(next.group[1].groupId, 'a')
})
test('whole edit reaches all segments after multiple splits', () => {
  const b = { ...replacement, groupId: 'a' }
  const c = { ...replacement, id: 'c', groupId: 'a', template: { ...replacement.template, date: '2026-10-08' } }
  const group = seriesGroup([c, { ...base, rule: { ...base.rule, until: '2026-10-04' } }, { ...b, rule: { ...b.rule, until: '2026-10-07' } }], c)
  assert.deepEqual(group.map(item => item.id), ['a', 'b', 'c'])
  const plan = planSeriesChange(group, [], undefined, { ...replacement, id: 'd', template: base.template })
  assert.deepEqual(plan.removeSeries, ['a', 'b', 'c'])
  assert.equal(plan.putSeries.length, 1)
  assert.equal(plan.putSeries[0].groupId, 'a')
})
test('weekday change retains completed historical records even when no longer scheduled', () => {
  const stored = expandSeries(base, '2026-10-01', '2026-10-02').map(task => ({ ...task, completed: true }))
  const next = { ...replacement, template: base.template, rule: { frequency: 'weekly', weekdays: [1] } }
  const plan = planSeriesChange([base], stored, undefined, next)
  assert.equal(plan.putTasks.length, 2)
  assert.ok(plan.putTasks.every(task => task.completed && task.title === 'old' && task.seriesId === 'b'))
  const deletion = planSeriesChange(plan.putSeries, plan.putTasks, undefined)
  assert.equal(deletion.removeTasks.length, 2)
})
test('matching completion, moved occurrence and tombstone keep identities without duplicates', () => {
  const records = expandSeries(base, '2026-10-05', '2026-10-07')
  const stored = [{ ...records[0], completed: true }, { ...records[1], date: '2026-11-01' }, { ...records[2], deleted: true }]
  const plan = planSeriesChange([base], stored, '2026-10-05', replacement)
  const next = apply([base], stored, plan)
  const tasks = mergeOccurrences(next.stored, next.group, '2026-10-05', '2026-10-10')
  assert.equal(tasks.length, 5)
  assert.equal(tasks.find(task => task.occurrenceDate === '2026-10-05').completed, true)
  assert.equal(tasks.find(task => task.occurrenceDate === '2026-10-06').date, '2026-11-01')
  assert.equal(tasks.some(task => task.date === '2026-10-07'), false)
})
test('following deletion stops at original date of moved occurrence, preserving past and unrelated tasks', () => {
  const records = expandSeries(base, '2026-10-04', '2026-10-06')
  const stored = [{ ...records[0], date: '2026-11-01' }, { ...records[1], date: '2026-09-01' }, { ...records[2], completed: true }, { ...base.template, id: 'solo' }]
  const plan = planSeriesChange([base], stored, '2026-10-05')
  assert.deepEqual(plan.removeTasks, [records[1].id, records[2].id])
  assert.equal(plan.putSeries[0].rule.until, '2026-10-04')
  assert.equal(plan.removeTasks.includes('solo'), false)
})
test('all deletion removes exceptions and rules including completed and deleted records', () => {
  const records = expandSeries(base, '2026-10-01', '2026-10-02')
  const plan = planSeriesChange([base], [{ ...records[0], completed: true }, { ...records[1], deleted: true }], undefined)
  assert.deepEqual(plan.removeSeries, ['a'])
  assert.equal(plan.removeTasks.length, 2)
  assert.equal(plan.putTasks.length, 0)
  assert.equal(plan.putSeries.length, 0)
})
test('monthly split at February last day preserves day 31 in March', () => {
  const monthly = { ...base, template: { ...base.template, date: '2027-01-31' }, rule: { frequency: 'monthly', monthDay: 31, weekdays: [] } }
  const plan = planSeriesChange([monthly], [], '2027-02-28', { id: 'b', template: { ...monthly.template, date: '2027-02-28' }, rule: monthly.rule })
  assert.deepEqual(expandSeries(plan.putSeries[1], '2027-02-01', '2027-04-30').map(task => task.date), ['2027-02-28', '2027-03-31', '2027-04-30'])
})
test('expired segments remain untouched by following change and input objects stay immutable', () => {
  const original = structuredClone(base)
  const plan = planSeriesChange([base], [], '2026-11-01')
  assert.deepEqual(plan, { removeSeries: [], putSeries: [], removeTasks: [], putTasks: [] })
  assert.deepEqual(base, original)
})
