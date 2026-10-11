import { db } from '../lib/db'
import { elapsedTime, pauseTimer, resumeTimer } from '../lib/timer'
import { dateKey } from '../lib/calendar'

export const timerRepository = {
  read: (date: string) => db.transaction('r', db.timerState, db.timerRecords, async () => ({ active: await db.timerState.get('active'),
    records: await db.timerRecords.where('date').equals(date).toArray() })),
  start: (title: string, taskId?: string) => db.transaction('rw', db.timerState, async () => {
    if (await db.timerState.get('active')) throw new Error('이미 진행 중인 타이머가 있어요.')
    const now = Date.now()
    await db.timerState.add({ id: 'active', sessionId: crypto.randomUUID(), title,
      taskId, date: dateKey(new Date(now)), startedAt: now, runningSince: now, elapsedMs: 0 })
  }),
  change: (sessionId: string, action: 'pause' | 'resume' | 'finish') => db.transaction('rw', db.timerState, db.timerRecords, async () => {
    const timer = await db.timerState.get('active')
    // A stale tab must never operate on a newer session.
    if (!timer || timer.sessionId !== sessionId) return
    const now = Date.now()
    if (action === 'finish') {
      await db.timerRecords.put({ id: timer.sessionId, title: timer.title, taskId: timer.taskId,
        date: timer.date, startedAt: timer.startedAt, finishedAt: now, elapsedMs: elapsedTime(timer, now) })
      await db.timerState.delete('active')
    } else await db.timerState.put(action === 'pause' ? pauseTimer(timer, now) : resumeTimer(timer, now))
  }),
}
