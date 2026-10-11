import Dexie, { type EntityTable } from 'dexie'
import type { Task, TaskSeries } from '../types/task'
import type { TimerState, TimerRecord } from '../types/timer'
import type { TimerImages } from '../types/timerImages'
import type { Anniversary } from '../types/anniversary'
import type { DayMemo } from '../types/dayMemo'

export const db = new Dexie('memo-zip') as Dexie & {
  tasks: EntityTable<Task, 'id'>
  series: EntityTable<TaskSeries, 'id'>
  timerState: EntityTable<TimerState, 'id'>
  timerRecords: EntityTable<TimerRecord, 'id'>
  timerImages: EntityTable<TimerImages, 'id'>
  anniversaries: EntityTable<Anniversary, 'id'>
  dayMemos: EntityTable<DayMemo, 'date'>
}

db.version(1).stores({ tasks: 'id, date, categoryId' })
db.version(2).stores({ tasks: 'id, date, categoryId', series: 'id' })
db.version(3).stores({ tasks: 'id, date, categoryId', series: 'id', timerState: 'id', timerRecords: 'id, date' })
db.version(4).stores({ tasks: 'id, date, categoryId', series: 'id', timerState: 'id', timerRecords: 'id, date', timerImages: 'id' })
db.version(5).stores({ tasks: 'id, date, categoryId', series: 'id', timerState: 'id', timerRecords: 'id, date', timerImages: 'id', anniversaries: 'id' })
db.version(6).stores({ tasks: 'id, date, categoryId', series: 'id', timerState: 'id', timerRecords: 'id, date', timerImages: 'id', anniversaries: 'id', dayMemos: 'date' })
