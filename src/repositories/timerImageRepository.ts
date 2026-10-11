import { db } from '../lib/db'
import type { TimerMood } from '../types/timerImages'

export const timerImageRepository = {
  read: () => db.timerImages.get('timer'),
  save: (target: TimerMood, source?: string) => db.transaction('rw', db.timerImages, async () => {
    const latest = await db.timerImages.get('timer')
    await db.timerImages.put({ id: 'timer', images: { ...latest?.images, [target]: source } })
  }),
}
