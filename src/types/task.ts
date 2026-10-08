export interface Task {
  id: string
  title: string
  date: string // YYYY-MM-DD, calendar date without UTC conversion
  startTime?: string // HH:mm
  endTime?: string
  completed: boolean
  categoryId?: string
  createdAt: string // ISO timestamp
}
