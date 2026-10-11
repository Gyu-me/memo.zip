export type TimerMood = 'idle' | 'running' | 'paused'
export const moodLabels: Record<TimerMood, string> = { idle: '대기', running: '작업 중', paused: '일시정지' }
export interface TimerImages {
  id: 'timer'
  images: Partial<Record<TimerMood, string>>
}
