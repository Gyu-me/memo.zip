import { useState, type CSSProperties, type PointerEvent } from 'react'
import type { Task } from '../types/task'
import { timelineLayout, dragRange, timeMinutes } from '../lib/timeline'
import styles from './DayTimeline.module.css'
import { movedRange, type ScheduleDragProps } from '../lib/scheduleDrag'

export interface TimelineColumnProps extends ScheduleDragProps {
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onSelectRange: (start: string, end: string) => void
  onEdit: (task: Task) => void
  date: string
  standalone?: boolean
}

export function TimelineColumn({ tasks, disabled, colorOf, onSelectRange, onEdit, date, standalone = false, activeDrag, onDragStart, onDragEnd, onDropTask }: TimelineColumnProps) {
  const [selection, setSelection] = useState<{ anchor: number; current: number } | null>(null)
  const [preview, setPreview] = useState<{ start: string; end: string; copy: boolean } | null>(null)
  const slotAt = (event: PointerEvent<HTMLDivElement>) => Math.max(0, Math.min(47, Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / 36)))
  return <div className={`${styles.events} ${standalone ? styles.column : ''}`}
    onDragOver={(event) => {
      if (disabled || !activeDrag?.task.startTime || !activeDrag.task.endTime) return
      event.preventDefault()
      const copy = event.ctrlKey || event.metaKey
      event.dataTransfer.dropEffect = copy ? 'copy' : 'move'
      const range = movedRange(activeDrag.task.startTime, activeDrag.task.endTime, (event.clientY - event.currentTarget.getBoundingClientRect().top) / 1.2 - activeDrag.offset)
      setPreview(range ? { ...range, copy } : null)
    }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreview(null) }}
    onDrop={(event) => {
      event.preventDefault(); setPreview(null)
      if (disabled || !activeDrag?.task.startTime || !activeDrag.task.endTime) return
      const range = movedRange(activeDrag.task.startTime, activeDrag.task.endTime, (event.clientY - event.currentTarget.getBoundingClientRect().top) / 1.2 - activeDrag.offset)
      if (range) onDropTask(activeDrag.task, date, event.ctrlKey || event.metaKey, range)
      onDragEnd()
    }}
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
    {activeDrag && preview && <div className={styles.selection} style={{ top: timeMinutes(preview.start) * 1.2, height: Math.max(36, (timeMinutes(preview.end) - timeMinutes(preview.start)) * 1.2) }}>{preview.copy ? '복제' : '이동'} · {preview.start}–{preview.end}</div>}
    {timelineLayout(tasks).map(({ task, start, end, column, columns }) => <button key={task.id}
      data-event draggable={!disabled} disabled={disabled} aria-label={`${task.title} ${task.startTime}부터 ${task.endTime}, 수정`}
      onDragStart={(event) => { event.dataTransfer.setData('application/x-memo-task', task.id); event.dataTransfer.effectAllowed = 'copyMove'; onDragStart(task, (event.clientY - event.currentTarget.getBoundingClientRect().top) / 1.2) }}
      onDragEnd={() => { setPreview(null); onDragEnd() }}
      className={`${styles.block} ${task.completed ? styles.completed : ''}`}
      style={{ '--task-color': colorOf(task), top: start * 1.2, height: Math.max(36, (end - start) * 1.2), left: `${column / columns * 100}%`, width: `${100 / columns}%` } as CSSProperties}
      onClick={() => onEdit(task)} title={`${task.title} · ${task.startTime}–${task.endTime}`}>
      <span className={styles.title}>{task.completed ? '✓ ' : '○ '}{task.title}</span>
      <small>{task.startTime}–{task.endTime}</small>
    </button>)}
  </div>
}
