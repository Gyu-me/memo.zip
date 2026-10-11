export interface TimerState {
  id: 'active'
  sessionId: string
  title: string
  taskId?: string
  date: string // Attributed to the date on which measurement started
  startedAt: number
  runningSince: number | null
  elapsedMs: number
}

export interface TimerRecord {
  id: string
  title: string
  taskId?: string
  date: string
  startedAt: number
  finishedAt: number
  elapsedMs: number
}
