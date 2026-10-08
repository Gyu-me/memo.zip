import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateKey, fromDateKey, monthDays, weekDays, shiftDate } from '../src/lib/calendar.ts'

test('calendar dates round-trip without UTC conversion', () => {
  for (const key of ['2026-01-01', '2026-12-31', '2024-02-29']) {
    assert.equal(dateKey(fromDateKey(key)), key)
  }
})

test('leap February includes 29 days in complete Monday-first weeks', () => {
  const dates = monthDays(new Date(2024, 1, 1))
  assert.equal(dates.length % 7, 0)
  assert.equal(dates[0].getDay(), 1)
  assert.equal(dates.at(-1).getDay(), 0)
  assert.equal(dates.filter((date) => date.getMonth() === 1).length, 29)
})

test('month crossing year boundary includes adjacent dates', () => {
  const dates = monthDays(new Date(2026, 11, 1))
  assert.equal(dateKey(dates[0]), '2026-11-30')
  assert.equal(dateKey(dates.at(-1)), '2027-01-03')
})

test('week starts Monday even for Sunday and crosses the year', () => {
  assert.deepEqual(weekDays('2027-01-03').map(dateKey), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  assert.equal(dateKey(weekDays('2026-10-05')[0]), '2026-10-05')
})

test('week navigation preserves weekday and handles leap day', () => {
  assert.equal(shiftDate('2024-02-29', 7), '2024-03-07')
  assert.equal(shiftDate('2024-03-07', -7), '2024-02-29')
  assert.equal(shiftDate('2026-12-31', 7), '2027-01-07')
})
