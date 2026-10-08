export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function monthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  // Monday first, including adjacent dates to complete calendar rows.
  const offset = (first.getDay() + 6) % 7
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + count) / 7) * 7
  return Array.from({ length: cells }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i))
}

export function shiftDate(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

export function weekDays(key: string): Date[] {
  const date = fromDateKey(key)
  date.setDate(date.getDate() - (date.getDay() + 6) % 7)
  return Array.from({ length: 7 }, (_, i) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + i))
}
