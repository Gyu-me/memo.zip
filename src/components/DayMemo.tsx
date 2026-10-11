import { useEffect, useState } from 'react'
import { dayMemoRepository } from '../repositories/dayMemoRepository'
import styles from './DayMemo.module.css'

export function DayMemo({ date }: { date: string }) {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let cancelled = false
    void dayMemoRepository.get(date).then(record => {
      if (cancelled) return
      setContent(record?.content ?? '')
      setSaved(record?.content ?? '')
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setError('메모를 불러오지 못했어요. 새로고침해주세요.')
    })
    return () => { cancelled = true }
  }, [date])
  async function save() {
    if (busy || loading) return
    setBusy(true); setError(''); setNotice('')
    try {
      await dayMemoRepository.save(date, content)
      setSaved(content); setNotice('메모를 저장했어요.')
    } catch { setError('저장하지 못했어요. 내용을 유지했으니 다시 시도해주세요.') }
    finally { setBusy(false) }
  }
  const dirty = content !== saved
  return <section className={styles.memo} aria-label="하루 메모">
    <h3>오늘의 작은 메모</h3>
    <p>{date}</p>
    <label htmlFor="day-memo">하루 메모</label>
    <textarea id="day-memo" rows={6} maxLength={10000} value={content} disabled={loading || busy} placeholder="생각나는 건 모두 적어두기 ♡" onChange={event => { setContent(event.target.value); setNotice('') }} />
    {loading && !error && <p role="status">메모를 불러오는 중…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className={styles.actions}><small>{content.length.toLocaleString()} / 10,000자{dirty ? ' · 저장 전' : ''}</small><button disabled={loading || busy || !dirty} onClick={() => void save()}>{busy ? '저장 중…' : '메모 저장'}</button></div>
    <small>날짜를 이동하기 전에 저장해주세요.</small>
  </section>
}
