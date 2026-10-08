import Dexie, { type EntityTable } from 'dexie'
import type { Task, TaskSeries } from '../types/task'

export const db = new Dexie('memo-zip') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  series: EntityTable<TaskSeries, 'id'>
}

db.version(1).stores({ tasks: 'id, date, categoryId' })
db.version(2).stores({ tasks: 'id, date, categoryId', series: 'id' })
