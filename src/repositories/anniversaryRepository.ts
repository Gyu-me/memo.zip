import { db } from '../lib/db'
import type { Anniversary } from '../types/anniversary'

export const anniversaryRepository = {
  list: () => db.anniversaries.toArray(),
  save: (item: Anniversary) => db.transaction('rw', db.anniversaries, async () => {
    if (item.featured) await db.anniversaries.toCollection().modify({ featured: false })
    await db.anniversaries.put(item)
  }),
  feature: (id?: string) => db.transaction('rw', db.anniversaries, async () => {
    await db.anniversaries.toCollection().modify({ featured: false })
    if (id) await db.anniversaries.update(id, { featured: true })
  }),
  remove: (id: string) => db.anniversaries.delete(id),
}
