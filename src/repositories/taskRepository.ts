import { db } from '../lib/db'
import type { Task } from '../types/task'

export const taskRepository = {
  listAll: () => db.tasks.toArray(),
  listByDate: (date: string) => db.tasks.where('date').equals(date).toArray(),
  save: (task: Task) => db.tasks.put(task),
  setCompleted: (id: string, completed: boolean) => db.tasks.update(id, { completed }),
  remove: (id: string) => db.tasks.delete(id),
}
