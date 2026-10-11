import type { Task, TaskSeries, RepeatRule } from '../types/task.ts'
import { shiftDate } from './calendar.ts'
import { isOccurrence } from './recurrence.ts'

export function seriesGroup(series: TaskSeries[], selected: TaskSeries): TaskSeries[] {
  const root = selected.groupId ?? selected.id
  return series.filter(item => (item.groupId ?? item.id) === root)
    .sort((a, b) => a.template.date.localeCompare(b.template.date))
}

// A pure change plan: the repository applies every write in one transaction.
export function planSeriesChange(group: TaskSeries[], stored: Task[], boundary: string | undefined,
  replacement?: { id: string; template: Task; rule: RepeatRule }) {
  const ids = new Set(group.map(item => item.id))
  const removeSeries: string[] = []
  const putSeries: TaskSeries[] = []
  for (const item of group) {
    if (boundary && item.rule.until && item.rule.until < boundary) continue
    if (boundary && item.template.date < boundary) {
      putSeries.push({ ...item, rule: { ...item.rule, until: shiftDate(boundary, -1) } })
    } else removeSeries.push(item.id)
  }
  const next: TaskSeries | undefined = replacement && {
    ...replacement, groupId: group[0].groupId ?? group[0].id,
    template: { ...replacement.template, seriesId: undefined, occurrenceDate: undefined, deleted: undefined, completed: false },
  }
  if (next) putSeries.push(next)
  const removeTasks: string[] = []
  const putTasks: Task[] = []
  for (const task of stored) {
    if (!task.seriesId || !ids.has(task.seriesId)) continue
    const originalDate = task.occurrenceDate ?? task.date
    if (boundary && originalDate < boundary) continue
    removeTasks.push(task.id)
    if (!next) continue
    if (isOccurrence(next, originalDate)) {
      putTasks.push({ ...next.template, ...task, ...(task.completed ? {} : {
        title: next.template.title, memo: next.template.memo, categoryId: next.template.categoryId,
        startTime: next.template.startTime, endTime: next.template.endTime,
      }), id: `${next.id}:${originalDate}`, seriesId: next.id, occurrenceDate: originalDate })
    } else if (task.completed && !task.deleted) {
      // A changed weekday must never erase a completed historical record.
      putTasks.push({ ...task, id: `${next.id}:${originalDate}`, seriesId: next.id, occurrenceDate: originalDate })
    }
  }
  return { removeSeries, putSeries, removeTasks, putTasks }
}
