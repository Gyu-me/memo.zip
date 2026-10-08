import { useEffect, useRef, type CSSProperties } from 'react'
import type { Task } from '../types/task'
import { TimelineColumn } from './TimelineColumn'
import styles from './DayTimeline.module.css'
import type { ScheduleDragProps } from '../lib/scheduleDrag'

interface Props extends ScheduleDragProps {
  date: string
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onToggle: (task: Task) => void
  onSelectRange: (start: string, end: string) => void
  onEdit: (task: Task) => void
}

export function DayTimeline({ date, tasks, disabled, colorOf, onToggle, onSelectRange, onEdit, ...dragProps }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  useEffect(() => { if (viewport.current) viewport.current.scrollTop = 6 * 72 }, [date])
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
<TimelineColumn {...dragProps} date={date} tasks={tasks} disabled={disabled} colorOf={colorOf} onSelectRange={onSelectRange} onEdit={onEdit} />
      </div>
    </div>
  </div>
}

