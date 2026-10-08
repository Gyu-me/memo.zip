import { useEffect, useRef, type CSSProperties } from 'react'
import type { Task } from '../types/task'
import { timelineLayout } from '../lib/timeline'
import styles from './DayTimeline.module.css'

interface Props {
  date: string
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onToggle: (task: Task) => void
}

export function DayTimeline({ date, tasks, disabled, colorOf, onToggle }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  useEffect(() => { if (viewport.current) viewport.current.scrollTop = 6 * 72 }, [date])
  const timed = timelineLayout(tasks)
  const untimed = tasks.filter((task) => !task.startTime || !task.endTime)
  return <div className={styles.wrapper}>
    <div className={styles.heading}><h2>하루 시간표</h2><span>30분 간격 · 블록을 눌러 완료 체크</span></div>
    <section className={styles.untimed} aria-label="시간 미지정 할 일">
      <h3>시간 없이 적어둔 할 일</h3>
      {untimed.length ? <div>{untimed.map((task) => <button key={task.id} disabled={disabled} aria-pressed={task.completed}
        onClick={() => onToggle(task)} style={{ '--task-color': colorOf(task) } as CSSProperties}
        className={task.completed ? styles.completed : ''}>{task.completed ? '✓ ' : '○ '}{task.title}</button>)}</div>
        : <p>시간 미지정 할 일이 없어요.</p>}
    </section>
    {!timed.length && <p className={styles.empty}>오른쪽에서 시작·종료 시간을 입력하면 여기에 표시돼요.</p>}
    <div className={styles.viewport} ref={viewport} tabIndex={0} aria-label={`${date} 시간표, 위아래로 스크롤`}>
      <div className={styles.timeline}>
        {Array.from({ length: 48 }, (_, i) => <div key={i} className={styles.row} style={{ top: i * 36 }}>
          <span>{`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`}</span><div />
        </div>)}
        <div className={styles.events}>
          {timed.map(({ task, start, end, column, columns }) => <button key={task.id}
            disabled={disabled} aria-pressed={task.completed} aria-label={`${task.title} ${task.startTime}부터 ${task.endTime}, ${task.completed ? '완료 해제' : '완료 체크'}`}
            className={`${styles.block} ${task.completed ? styles.completed : ''}`}
            style={{ '--task-color': colorOf(task), top: start * 1.2, height: Math.max(36, (end - start) * 1.2), left: `${column / columns * 100}%`, width: `${100 / columns}%` } as CSSProperties}
            onClick={() => onToggle(task)} title={`${task.title} · ${task.startTime}–${task.endTime}`}>
            <span className={styles.title}>{task.completed ? '✓ ' : '○ '}{task.title}</span>
            <small>{task.startTime}–{task.endTime}</small>
          </button>)}
        </div>
      </div>
    </div>
  </div>
}
