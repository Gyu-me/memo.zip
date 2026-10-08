import type { Task } from '../types/task'
import { timeMinutes } from './timeline.ts'

export interface ScheduleDrag { task: Task; offset: number }
export interface ScheduleDragProps {
  activeDrag: ScheduleDrag | null
  onDragStart: (task: Task, offset: number) => void
  onDragEnd: () => void
  onDropTask: (task: Task, date: string, copy: boolean, range?: { start: string; end: string }) => void
}

export function movedRange(start: string, end: string, targetMinutes: number) {
  const duration = timeMinutes(end) - timeMinutes(start)
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440 || !Number.isFinite(targetMinutes)) return null
  const nextStart = Math.max(0, Math.min(Math.floor((1440 - duration) / 30) * 30, Math.round(targetMinutes / 30) * 30))
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  return { start: format(nextStart), end: format(nextStart + duration) }
}

export function relocateTask<T extends { id: string; date: string; completed: boolean; createdAt: string; startTime?: string; endTime?: string }>(task: T, date: string, copy: boolean, newId: string, now: string, range?: { start: string; end: string }): T {
  return { ...task, date, ...(range ? { startTime: range.start, endTime: range.end } : {}),
    ...(copy ? { id: newId, completed: false, createdAt: now } : {}) }
}
