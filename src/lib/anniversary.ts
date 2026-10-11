import { dateKey, fromDateKey } from './calendar.ts'
import type { Anniversary } from '../types/anniversary.ts'

export function anniversaryTarget(item: Pick<Anniversary, 'date' | 'yearly'>, today: string): string {
  if (!item.yearly || item.date > today) return item.date
  const original = fromDateKey(item.date)
  const current = fromDateKey(today)
  const inYear = (year: number) => dateKey(new Date(year, original.getMonth(),
    Math.min(original.getDate(), new Date(year, original.getMonth() + 1, 0).getDate())))
  const candidate = inYear(current.getFullYear())
  return candidate < today ? inYear(current.getFullYear() + 1) : candidate
}

export function dayDifference(target: string, today: string): number {
  const ordinal = (key: string) => {
    const date = fromDateKey(key)
    // UTC used only for calendar-day arithmetic, never for converting user dates.
    const utc = new Date(0)
    utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    utc.setUTCHours(0, 0, 0, 0)
    return utc.getTime() / 86400000
  }
  return ordinal(target) - ordinal(today)
}

export function dDayLabel(target: string, today: string): string {
  const days = dayDifference(target, today)
  return days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${-days}`
}
