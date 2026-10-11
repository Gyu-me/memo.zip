import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import type { Task } from '../types/task'
import type { TimerState, TimerRecord } from '../types/timer'
import { timerRepository } from '../repositories/timerRepository'
import { elapsedTime, formatDuration } from '../lib/timer'
import styles from './WorkTimer.module.css'
import { TimerImageSettings } from './TimerImageSettings'

export function WorkTimer({ date, tasks }: { date: string; tasks: Task[] }) {
  const [active, setActive] = useState<TimerState>()
  const [records, setRecords] = useState<TimerRecord[]>([])
  const [taskId, setTaskId] = useState('')
  const [now, setNow] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadedDate, setLoadedDate] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(() => timerRepository.read(date)).subscribe({
      next: data => { setActive(data.active); setRecords(data.records); setLoadedDate(date); setReady(true); setNow(Date.now()) },
      error: () => { setError('타이머 기록을 읽지 못했어요. 새로고침해주세요.'); setReady(false) },
    })
    return () => subscription.unsubscribe()
  }, [date])
  useEffect(() => {
    if (!active || active.runningSince === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [active])
  async function act(action: 'start' | 'pause' | 'resume' | 'finish') {
    if (busy || !ready) return
    setBusy(true); setError('')
    try {
      if (action === 'start') {
        const task = tasks.find(item => item.id === taskId)
        await timerRepository.start(task?.title ?? '자유 작업', task?.id)
      } else if (active) await timerRepository.change(active.sessionId, action)
    } catch { setError('타이머 상태를 저장하지 못했어요. 다른 창의 진행 상태를 확인하고 다시 시도해주세요.') }
    finally { setBusy(false) }
  }
  const visibleRecords = loadedDate === date ? records : []
  const total = visibleRecords.reduce((sum, record) => sum + record.elapsedMs, 0)
    + (active?.date === date ? elapsedTime(active, now) : 0)
  return <section className={styles.timer} aria-label="작업 타이머">
    <h3>나의 집중 시간</h3>
    <p className={styles.status}>{active ? active.runningSince === null ? '잠깐 쉬는 중' : '작업 중' : '시작할 준비 완료'}</p>
    <TimerImageSettings mood={active ? active.runningSince === null ? 'paused' : 'running' : 'idle'} />
    <div className={styles.clock} aria-label="현재 작업 시간">{formatDuration(active ? elapsedTime(active, now) : 0)}</div>
    {active ? <><p className={styles.title}>{active.title}</p><p className={styles.note}>시작 날짜 {active.date}에 기록돼요.</p><div className={styles.actions}>
      <button disabled={busy || !ready} onClick={() => void act(active.runningSince === null ? 'resume' : 'pause')}>{active.runningSince === null ? '계속하기' : '일시정지'}</button>
      <button disabled={busy || !ready} onClick={() => void act('finish')}>종료하고 기록</button>
    </div></> : <><label>측정할 할 일<select value={tasks.some(task => task.id === taskId) ? taskId : ''} onChange={event => setTaskId(event.target.value)} disabled={busy || !ready}>
      <option value="">자유 작업</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
    </select></label><button disabled={busy || !ready} onClick={() => void act('start')}>작업 시작</button></>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p className={styles.note}>창을 닫아도 종료 전까지 측정됩니다. 쉬는 시간은 일시정지해주세요.</p>
    <h4>{date} · 합계 {formatDuration(total)}</h4>
    <ul>{visibleRecords.toSorted((a, b) => b.finishedAt - a.finishedAt).map(record => <li key={record.id}><span>{record.title}</span><strong>{formatDuration(record.elapsedMs)}</strong></li>)}</ul>
    {!visibleRecords.length && <p className={styles.note}>종료한 작업 기록이 아직 없어요.</p>}
  </section>
}
