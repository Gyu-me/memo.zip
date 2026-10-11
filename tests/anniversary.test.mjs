import test from 'node:test'
import assert from 'node:assert/strict'
import { anniversaryTarget, dDayLabel, dayDifference } from '../src/lib/anniversary.ts'
test('D-day formats future, today, past across calendar boundaries', () => {
  assert.equal(dDayLabel('2027-01-01', '2026-12-31'), 'D-1')
  assert.equal(dDayLabel('2026-10-12', '2026-10-12'), 'D-day')
  assert.equal(dDayLabel('2026-10-01', '2026-10-12'), 'D+11')
  assert.equal(dayDifference('2024-03-01', '2024-02-28'), 2)
})
test('annual date stays on today then advances to next year', () => {
  const item = { date: '2020-10-12', yearly: true }
  assert.equal(anniversaryTarget(item, '2026-10-12'), '2026-10-12')
  assert.equal(anniversaryTarget(item, '2026-10-13'), '2027-10-12')
})
test('Feb 29 clamps to Feb 28 without losing original leap-year date', () => {
  const item = { date: '2024-02-29', yearly: true }
  assert.equal(anniversaryTarget(item, '2027-02-28'), '2027-02-28')
  assert.equal(anniversaryTarget(item, '2027-03-01'), '2028-02-29')
})
test('one-off and not-yet-started annual dates retain original year', () => {
  assert.equal(anniversaryTarget({ date: '2020-01-01', yearly: false }, '2026-10-12'), '2020-01-01')
  assert.equal(anniversaryTarget({ date: '2028-01-01', yearly: true }, '2026-10-12'), '2028-01-01')
})
