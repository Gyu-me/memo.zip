import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { dateKey, weekDays } from '../lib/calendar'
import type { Task } from '../types/task'
import { TimelineColumn } from './TimelineColumn'
import styles from './WeekTimeline.module.css'

interface Props {
  selected: string
  today: string
  tasks: Task[]
  disabled: boolean
  colorOf: (task: Task) => string
  onSelectDate: (date: string) => void
  onSelectRange: (date: string, start: string, end: string) => void
  onEdit: (task: Task) => void
  onToggle: (task: Task) => void
}

export function WeekTimeline({ selected, today, tasks, disabled, colorOf, onSelectDate, onSelectRange, onEdit, onToggle }: Props) {
  const dates = weekDays(selected)
  const weekStart = dateKey(dates[0])
  const viewport = useRef<HTMLDivElement>(null)
  const [scrollbar, setScrollbar] = useState(0)
  useEffect(() => {
    const element = viewport.current!
    const observer = new ResizeObserver(() => setScrollbar(element.offsetWidth - element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (viewport.current) viewport.current.scrollTop = 6 * 72 }, [weekStart])
  return <section className={styles.wrapper} aria-label="주간 시간표">
    <p className={styles.hint}>빈 시간을 드래그해 추가하세요. 날짜를 누르면 오른쪽 할 일이 바뀝니다.</p>
    <div className={styles.horizontal}>
      <div className={styles.sheet}>
        <div className={styles.headers} style={{ paddingRight: scrollbar }}>
          <span>시간</span>
          {dates.map((date) => {
            const key = dateKey(date)
            return <button key={key} disabled={disabled} aria-label={`${key} 선택`} aria-pressed={selected === key}
              className={key === today ? styles.today : ''} onClick={() => onSelectDate(key)}>
              <small>{date.toLocaleDateString('ko-KR', { weekday: 'short' })}</small><strong>{date.getMonth() + 1}/{date.getDate()}</strong>
            </button>
          })}
        </div>
        <div className={styles.untimed} style={{ paddingRight: scrollbar }}>
          <span>시간<br />미지정</span>
          {dates.map((date) => {
            const key = dateKey(date)
            const entries = tasks.filter((task) => task.date === key && (!task.startTime || !task.endTime))
            return <div key={key} aria-label={`${key} 시간 미지정 할 일`}>
              {entries.length ? entries.map((task) => <button key={task.id} disabled={disabled} aria-pressed={task.completed}
                onClick={() => onToggle(task)} className={task.completed ? styles.completed : ''} style={{ '--task-color': colorOf(task) } as CSSProperties}>
                {task.completed ? '✓ ' : '○ '}{task.title}
              </button>) : <span className={styles.empty}>—</span>}
            </div>
          })}
        </div>
        <div ref={viewport} className={styles.viewport} tabIndex={0} aria-label="주간 시간표 스크롤">
          <div className={styles.grid}>
            <div className={styles.timeLabels}>{Array.from({ length: 48 }, (_, i) => <span key={i}>{`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`}</span>)}</div>
            {dates.map((date) => {
              const key = dateKey(date)
              return <div key={key} className={`${styles.day} ${key === selected ? styles.selected : ''}`}>
                <TimelineColumn standalone date={key} tasks={tasks.filter((task) => task.date === key)} disabled={disabled} colorOf={colorOf}
                  onSelectRange={(start, end) => onSelectRange(key, start, end)} onEdit={onEdit} />
              </div>
            })}
          </div>
        </div>
      </div>
    </div>
  </section>
}
