import { db } from '../lib/db'

export const dayMemoRepository = {
  get: (date: string) => db.dayMemos.get(date),
  save: (date: string, content: string) => db.dayMemos.put({ date, content }),
}
