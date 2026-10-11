import type { TimerState } from '../types/timer.ts'

export function elapsedTime(timer: TimerState, now: number): number {
  return timer.elapsedMs + (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince))
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  return { ...timer, elapsedMs: elapsedTime(timer, now), runningSince: null }
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  return timer.runningSince === null ? { ...timer, runningSince: now } : timer
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':')
}
