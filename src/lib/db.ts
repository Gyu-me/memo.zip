import Dexie, { type EntityTable } from 'dexie'
import type { Task } from '../types/task'

export const db = new Dexie('memo-zip') as Dexie & {
  tasks: EntityTable<Task, 'id'>
}

db.version(1).stores({ tasks: 'id, date, categoryId' })
