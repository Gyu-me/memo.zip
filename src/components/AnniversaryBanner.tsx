import { useEffect, useState, type FormEvent } from 'react'
import { liveQuery } from 'dexie'
import type { Anniversary } from '../types/anniversary'
import { anniversaryRepository } from '../repositories/anniversaryRepository'
import { anniversaryTarget, dDayLabel } from '../lib/anniversary'
import { readImageFile } from '../lib/imageFile'
import { Popup } from './Popup'
import styles from './AnniversaryBanner.module.css'

const colors = ['#fceaf1', '#fff0e5', '#fff8d9', '#e8f6eb', '#eaf2fc', '#f0eafb']
export function AnniversaryBanner({ today }: { today: string }) {
  const [items, setItems] = useState<Anniversary[]>([])
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string>()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [yearly, setYearly] = useState(false)
  const [featured, setFeatured] = useState(true)
  const [color, setColor] = useState(colors[0])
  const [image, setImage] = useState<string>()
  useEffect(() => {
    const subscription = liveQuery(() => anniversaryRepository.list()).subscribe({
      next: records => { setItems(records); setReady(true) },
      error: () => { setError('기념일을 불러오지 못했어요. 새로고침해주세요.'); setReady(false) },
    })
    return () => subscription.unsubscribe()
  }, [])
  function fill(item?: Anniversary) {
    setEditing(item?.id); setTitle(item?.title ?? ''); setDate(item?.date ?? today)
    setYearly(item?.yearly ?? false); setFeatured(item?.featured ?? true)
    setColor(item?.color ?? colors[0]); setImage(item?.image); setError('')
  }
  async function mutate(action: () => Promise<unknown>) {
    if (busy || !ready) return false
    setBusy(true); setError('')
    try { await action(); return true }
    catch { setError('기념일을 저장하지 못했어요. 입력 내용은 유지되니 다시 시도해주세요.'); return false }
    finally { setBusy(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) { setError('기념일 이름을 입력해주세요.'); return }
    if (await mutate(() => anniversaryRepository.save({ id: editing ?? crypto.randomUUID(), title: title.trim(), date, yearly, color, image, featured }))) fill()
  }
  const main = items.find(item => item.featured)
  const target = main ? anniversaryTarget(main, today) : undefined
  return <>
    <section className={styles.banner} aria-label="기념일 배너" style={{ backgroundColor: main?.color ?? colors[0] }}>
      <div><span className={styles.eyebrow}>dear my days</span>
        <h2>{main?.title ?? '기억나는 건, 일단 적어두자.'}</h2>
        {main && target ? <><strong className={styles.count}>{dDayLabel(target, today)}</strong><p>{target}{main.yearly ? ' · 매년 기념일' : ''}</p></> : <p>작은 할 일도 차곡차곡 모아두는 곳 ✿</p>}
        <button disabled={!ready} onClick={() => { fill(); setOpen(true) }}>기념일 관리</button>
      </div>
      {main?.image && <img src={main.image} alt={`${main.title} 배너 이미지`} />}
    </section>
    {error && !open && <p role="alert" className={styles.error}>{error}</p>}
    {open && <Popup title="기념일 관리" busy={busy} onClose={() => setOpen(false)}>
      <p className={styles.note}>D-day는 오늘 기준이에요. 매년 기념일은 다음 날짜까지 계산하고, 2월 29일은 평년에 2월 28일로 표시해요.</p>
      <ul className={styles.list}>{items.map(item => <li key={item.id}>
        <span><strong>{item.title}</strong> · {dDayLabel(anniversaryTarget(item, today), today)}<small>{item.date}{item.yearly ? ' · 매년' : ''}{item.featured ? ' · 대표 배너' : ''}</small></span>
        <div className={styles.actions}><button disabled={busy} onClick={() => fill(item)} aria-label={`${item.title} 기념일 수정`}>수정</button>
          <button disabled={busy} onClick={() => void mutate(() => anniversaryRepository.feature(item.id))} aria-label={`${item.title} 대표 배너 선택`}>대표로</button>
          <button disabled={busy} onClick={() => { if (window.confirm(`“${item.title}” 기념일을 삭제할까요?`)) void mutate(() => anniversaryRepository.remove(item.id)).then(saved => { if (saved && editing === item.id) fill() }) }} aria-label={`${item.title} 기념일 삭제`}>삭제</button></div>
      </li>)}</ul>
      {!items.length && <p className={styles.note}>등록된 기념일이 없어요. 첫 기념일을 적어보세요.</p>}
      <button disabled={busy} onClick={() => void mutate(() => anniversaryRepository.feature())}>기본 문구 배너 사용</button>
      <form onSubmit={submit} className={styles.form}>
        <h3>{editing ? '기념일 수정' : '새 기념일'}</h3>
        <label>기념일 이름<input value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} disabled={busy} /></label>
        <label>기념일 날짜<input type="date" value={date} onInput={event => setDate(event.currentTarget.value)} required disabled={busy} /></label>
        <label className={styles.check}><input type="checkbox" checked={yearly} onChange={event => setYearly(event.target.checked)} disabled={busy} />매년 반복</label>
        <label className={styles.check}><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)} disabled={busy} />대표 배너로 표시</label>
        <fieldset disabled={busy}><legend>배너 색상</legend><div className={styles.colors}>{colors.map((value, index) => <label key={value}><input type="radio" name="banner-color" checked={color === value} onChange={() => setColor(value)} aria-label={['분홍 배너', '피치 배너', '노랑 배너', '민트 배너', '하늘 배너', '라벤더 배너'][index]} /><span style={{ background: value }} /></label>)}</div></fieldset>
        <label>배너 이미지 (선택)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''
          if (file) { setBusy(true); setError(''); void readImageFile(file).then(setImage).catch(failure => setError(failure.message)).finally(() => setBusy(false)) }
        }} /></label>
        <p className={styles.note}>PNG·JPG·WebP·GIF, 최대 2MB. 이미지가 잘리지 않도록 표시해요.</p>
        {image && <><img className={styles.preview} src={image} alt="등록할 배너 이미지 미리보기" /><button type="button" disabled={busy} onClick={() => setImage(undefined)}>이미지 사용 안 함</button></>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button disabled={busy || !ready}>{busy ? '처리 중…' : editing ? '기념일 수정 저장' : '기념일 추가'}</button>{editing && <button type="button" disabled={busy} onClick={() => fill()}>새 기념일 작성</button>}</div>
      </form>
    </Popup>}
  </>
}
