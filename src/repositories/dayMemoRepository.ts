import { db } from '../lib/db'
import type { MemoSticker } from '../types/dayMemo'

export const dayMemoRepository = {
  get: (date: string) => db.dayMemos.get(date),
  save: (date: string, content: string) => db.transaction('rw', db.dayMemos, async () => {
    const record = await db.dayMemos.get(date)
    await db.dayMemos.put({ ...record, date, content })
  }),
  saveStickers: (date: string, stickers: MemoSticker[]) => db.transaction('rw', db.dayMemos, async () => {
    const record = await db.dayMemos.get(date)
    await db.dayMemos.put({ ...record, date, content: record?.content ?? '', stickers })
  }),
}
