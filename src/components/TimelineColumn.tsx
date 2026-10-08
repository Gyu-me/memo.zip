import { useState, type CSSProperties, type PointerEvent } from 'react'
import type { Task } from '../types/task'
import { timelineLayout, dragRange } from '../lib/timeline'
import styles from './DayTimeline.module.css'

export interface TimelineColumnProps {
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onSelectRange: (start: string, end: string) => void
  onEdit: (task: Task) => void
  date: string
  standalone?: boolean
}

export function TimelineColumn({ tasks, disabled, colorOf, onSelectRange, onEdit, date, standalone = false }: TimelineColumnProps) {
  const [selection, setSelection] = useState<{ anchor: number; current: number } | null>(null)
  const slotAt = (event: PointerEvent<HTMLDivElement>) => Math.max(0, Math.min(47, Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / 36)))
  return <div className={`${styles.events} ${standalone ? styles.column : ''}`}
    onPointerDown={(event) => {
      if (disabled || event.button !== 0 || (event.target as HTMLElement).closest('[data-event]')) return
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId)
      const slot = slotAt(event); setSelection({ anchor: slot, current: slot })
    }}
    onPointerMove={(event) => { if (selection) setSelection({ ...selection, current: slotAt(event) }) }}
    onPointerUp={(event) => {
      if (!selection) return
      const range = dragRange(selection.anchor, slotAt(event)); setSelection(null)
      onSelectRange(range.start, range.end)
    }}
    onPointerCancel={() => setSelection(null)}>
    {Array.from({ length: 48 }, (_, i) => <button key={i} className={styles.slot} disabled={disabled} style={{ top: i * 36 }} aria-label={`${date} ${dragRange(i, i).start} 일정 추가`}
      onClick={(event) => { if (event.detail === 0) { const range = dragRange(i, i); onSelectRange(range.start, range.end) } }} />)}
    {selection && <div className={styles.selection} style={{ top: Math.min(selection.anchor, selection.current) * 36, height: (Math.abs(selection.anchor - selection.current) + 1) * 36 }} />}
    {timelineLayout(tasks).map(({ task, start, end, column, columns }) => <button key={task.id}
      data-event disabled={disabled} aria-label={`${task.title} ${task.startTime}부터 ${task.endTime}, 수정`}
      className={`${styles.block} ${task.completed ? styles.completed : ''}`}
      style={{ '--task-color': colorOf(task), top: start * 1.2, height: Math.max(36, (end - start) * 1.2), left: `${column / columns * 100}%`, width: `${100 / columns}%` } as CSSProperties}
      onClick={() => onEdit(task)} title={`${task.title} · ${task.startTime}–${task.endTime}`}>
      <span className={styles.title}>{task.completed ? '✓ ' : '○ '}{task.title}</span>
      <small>{task.startTime}–{task.endTime}</small>
    </button>)}
  </div>
}
