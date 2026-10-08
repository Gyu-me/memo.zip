import type { Task, TaskSeries } from '../types/task.ts'
import { fromDateKey, shiftDate } from './calendar.ts'

export function isOccurrence(series: TaskSeries, date: string): boolean {
  if (date < series.template.date || (series.rule.until && date > series.rule.until)) return false
  const current = fromDateKey(date)
  if (series.rule.frequency === 'daily') return true
  if (series.rule.frequency === 'weekly') return series.rule.weekdays.includes(current.getDay())
  const anchor = fromDateKey(series.template.date).getDate()
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
  return current.getDate() === Math.min(anchor, lastDay)
}

// Generate only the requested window, never an infinite list of future records.
export function expandSeries(series: TaskSeries, start: string, end: string): Task[] {
  const tasks: Task[] = []
  for (let date = start; date <= end; date = shiftDate(date, 1)) {
    if (!isOccurrence(series, date)) continue
    tasks.push({ ...series.template, id: `${series.id}:${date}`, date,
      seriesId: series.id, occurrenceDate: date, completed: false })
  }
  return tasks
}

export function mergeOccurrences(stored: Task[], series: TaskSeries[], start: string, end: string): Task[] {
  const overrides = new Set(stored.map(task => task.id))
  return [...stored.filter(task => !task.deleted),
    ...series.flatMap(item => expandSeries(item, start, end)).filter(task => !overrides.has(task.id))]
}

export function repeatDescription(series: TaskSeries): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  const rule = series.rule
  return rule.frequency === 'daily' ? '매일' : rule.frequency === 'weekly'
    ? `매주 ${rule.weekdays.map(day => labels[day]).join('·')}`
    : `매월 ${fromDateKey(series.template.date).getDate()}일 (없는 날은 말일)`
}
