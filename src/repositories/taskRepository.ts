import { db } from '../lib/db'
import type { Task, TaskSeries } from '../types/task'
import { mergeOccurrences } from '../lib/recurrence'

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
}
