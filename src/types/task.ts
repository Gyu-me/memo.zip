export interface Task {
  id: string
  title: string
  memo?: string
  date: string // YYYY-MM-DD, calendar date without UTC conversion
  startTime?: string // HH:mm
  endTime?: string
  completed: boolean
  categoryId?: string
  createdAt: string // ISO timestamp
  seriesId?: string
  occurrenceDate?: string // Original date, retained when one occurrence moves
  deleted?: boolean // Suppresses one generated occurrence
}

export interface RepeatRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  weekdays: number[] // Sunday = 0
  monthDay?: number // Anchor survives a split on February's last day
  until?: string // Inclusive calendar date; absent means no end
}

export interface TaskSeries {
  id: string
  groupId?: string // Links segments created by "this and following"
  template: Task
  rule: RepeatRule
}

export type RepeatScope = 'one' | 'following' | 'all'
