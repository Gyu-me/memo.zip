import { db } from '../lib/db'
import type { Task, TaskSeries } from '../types/task'
import { mergeOccurrences } from '../lib/recurrence'
import { planSeriesChange, seriesGroup } from '../lib/seriesChanges'
import type { RepeatRule } from '../types/task'

export const taskRepository = {
  listAll: async (start: string, end: string) => {
    const [stored, series] = await Promise.all([db.tasks.toArray(), db.series.toArray()])
    return { tasks: mergeOccurrences(stored, series, start, end), series }
  },
  save: (task: Task) => db.tasks.put(task),
  saveSeries: (series: TaskSeries) => db.series.add(series),
  setCompleted: (task: Task, completed: boolean) => db.tasks.put({ ...task, completed }),
  remove: (task: Task) => task.seriesId
    ? db.tasks.put({ ...task, deleted: true }) : db.tasks.delete(task.id),
  changeSeries: (task: Task, scope: 'following' | 'all', replacement?: { id: string; template: Task; rule: RepeatRule }) =>
    db.transaction('rw', db.tasks, db.series, async () => {
      const allSeries = await db.series.toArray()
      const selected = allSeries.find(item => item.id === task.seriesId)
      if (!selected) throw new Error('반복 일정이 존재하지 않습니다.')
      const plan = planSeriesChange(seriesGroup(allSeries, selected), await db.tasks.toArray(),
        scope === 'following' ? task.occurrenceDate ?? task.date : undefined, replacement)
      await db.series.bulkDelete(plan.removeSeries)
      await db.series.bulkPut(plan.putSeries)
      await db.tasks.bulkDelete(plan.removeTasks)
      await db.tasks.bulkPut(plan.putTasks)
    }),
}
