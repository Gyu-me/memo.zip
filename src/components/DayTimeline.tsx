import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Task } from '../types/task'
import { timelineLayout, dragRange } from '../lib/timeline'
import styles from './DayTimeline.module.css'

interface Props {
  date: string
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onToggle: (task: Task) => void
  onSelectRange: (start: string, end: string) => void
  onEdit: (task: Task) => void
}

export function DayTimeline({ date, tasks, disabled, colorOf, onToggle, onSelectRange, onEdit }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<{ anchor: number; current: number } | null>(null)
  const slotAt = (event: PointerEvent<HTMLDivElement>) => Math.max(0, Math.min(47, Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / 36)))
  useEffect(() => { if (viewport.current) viewport.current.scrollTop = 6 * 72 }, [date])
  const timed = timelineLayout(tasks)
  const untimed = tasks.filter((task) => !task.startTime || !task.endTime)
  return <div className={styles.wrapper}>
    <div className={styles.heading}><h2>하루 시간표</h2><span>빈 시간을 드래그해서 추가 · 일정 클릭으로 수정</span></div>
    <section className={styles.untimed} aria-label="시간 미지정 할 일">
      <h3>시간 없이 적어둔 할 일</h3>
      {untimed.length ? <div>{untimed.map((task) => <button key={task.id} disabled={disabled} aria-pressed={task.completed}
        onClick={() => onToggle(task)} style={{ '--task-color': colorOf(task) } as CSSProperties}
        className={task.completed ? styles.completed : ''}>{task.completed ? '✓ ' : '○ '}{task.title}</button>)}</div>
        : <p>시간 미지정 할 일이 없어요.</p>}
    </section>
    <p className={styles.empty}>드래그 또는 시간 칸을 클릭하세요. 키보드는 시간 칸에서 Enter를 누르면 됩니다.</p>
    <div className={styles.viewport} ref={viewport} tabIndex={0} aria-label={`${date} 시간표, 위아래로 스크롤`}>
      <div className={styles.timeline}>
        {Array.from({ length: 48 }, (_, i) => <div key={i} className={styles.row} style={{ top: i * 36 }}>
          <span>{`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`}</span><div />
        </div>)}
        <div className={styles.events}
          onPointerDown={(event) => { if (disabled || event.button !== 0 || (event.target as HTMLElement).closest('[data-event]')) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const slot = slotAt(event); setSelection({ anchor: slot, current: slot }) }}
          onPointerMove={(event) => { if (selection) setSelection({ ...selection, current: slotAt(event) }) }}
          onPointerUp={(event) => { if (!selection) return; const range = dragRange(selection.anchor, slotAt(event)); setSelection(null); onSelectRange(range.start, range.end) }}
          onPointerCancel={() => setSelection(null)}>
          {Array.from({ length: 48 }, (_, i) => <button key={i} className={styles.slot} disabled={disabled} style={{ top: i * 36 }} aria-label={`${dragRange(i, i).start} 일정 추가`}
            onClick={(event) => { if (event.detail === 0) { const range = dragRange(i, i); onSelectRange(range.start, range.end) } }} />)}
          {selection && <div className={styles.selection} style={{ top: Math.min(selection.anchor, selection.current) * 36, height: (Math.abs(selection.anchor - selection.current) + 1) * 36 }} />}
          {timed.map(({ task, start, end, column, columns }) => <button key={task.id}
            data-event disabled={disabled} aria-label={`${task.title} ${task.startTime}부터 ${task.endTime}, 수정`}
            className={`${styles.block} ${task.completed ? styles.completed : ''}`}
            style={{ '--task-color': colorOf(task), top: start * 1.2, height: Math.max(36, (end - start) * 1.2), left: `${column / columns * 100}%`, width: `${100 / columns}%` } as CSSProperties}
            onClick={() => onEdit(task)} title={`${task.title} · ${task.startTime}–${task.endTime}`}>
            <span className={styles.title}>{task.completed ? '✓ ' : '○ '}{task.title}</span>
            <small>{task.startTime}–{task.endTime}</small>
          </button>)}
        </div>
      </div>
    </div>
  </div>
}
