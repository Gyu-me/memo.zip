import { useEffect, useRef, useState, type ReactNode } from 'react'
import { dayMemoRepository } from '../repositories/dayMemoRepository'
import type { MemoSticker } from '../types/dayMemo'
import { readImageFile } from '../lib/imageFile'
import styles from './DayStickers.module.css'

export function DayStickers({ date, children, onMode }: { date: string; children: ReactNode; onMode: (mode: boolean) => void }) {
  const [items, setItems] = useState<MemoSticker[]>([])
  const [mode, setMode] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string>()
  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; x: number; y: number; clientX: number; clientY: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    if (surface.current?.parentElement) surface.current.parentElement.scrollTop = 6 * 72
    void dayMemoRepository.get(date).then(record => {
      if (cancelled) return
      setItems((record?.stickers ?? []).map((item, index) => ({ ...item, x: item.x ?? 0.3 + index * 0.15, y: item.y ?? 0.28, rotation: item.rotation ?? 0 })))
      setReady(true)
    }).catch(() => { if (!cancelled) setMessage('스티커를 불러오지 못했어요. 다시 열어주세요.') })
    return () => { cancelled = true }
  }, [date])
  function update(id: string, change: Partial<MemoSticker>) {
    setItems(current => current.map(item => item.id === id ? { ...item, ...change } : item)); setDirty(true); setMessage('')
  }
  function add(data: { emoji?: string; image?: string }) {
    const id = crypto.randomUUID()
    const viewport = surface.current?.parentElement
    const y = viewport && surface.current ? (viewport.scrollTop + 140) / surface.current.clientHeight : 0.28
    setItems(current => [...current, { id, ...data, size: 72, x: 0.5, y, rotation: 0 }]); setSelected(id); setDirty(true); setMessage('')
  }
  async function save() {
    setBusy(true); setMessage('')
    try { await dayMemoRepository.saveStickers(date, items); setDirty(false); setMessage('꾸미기를 저장했어요.') }
    catch { setMessage('저장하지 못했어요. 다시 시도해주세요.') }
    finally { setBusy(false) }
  }
  const active = items.find(item => item.id === selected)
  const blocked = !ready || busy
  return <>
    <div className={styles.tools}>
      <button disabled={blocked} aria-pressed={mode} onClick={() => { setMode(!mode); onMode(!mode) }}>{mode ? '꾸미기 모드 끄기' : '꾸미기 모드 켜기'}</button>
      {mode && <>
        <div className={styles.presets}>{['🌷', '🎀', '🍀', '⭐', '🐱', '💗'].map(emoji => <button disabled={blocked || items.length >= 6} key={emoji} aria-label={`${emoji} 스티커 붙이기`} onClick={() => add({ emoji })}>{emoji}</button>)}</div>
        <label>이미지 스티커<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={blocked || items.length >= 6} onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''
          if (!file) return
          setBusy(true)
          void readImageFile(file).then(image => add({ image })).catch(error => setMessage(error instanceof Error ? error.message : '이미지를 읽지 못했어요.')).finally(() => setBusy(false))
        }} /></label>
        <p>스티커를 드래그하거나 선택 후 방향키로 옮겨보세요. 최대 6개 · 이미지당 2MB.</p>
        {active && <div className={styles.controls}>
          <label>크기<input aria-label="선택 스티커 크기" type="range" min="40" max="120" step="8" value={active.size} disabled={blocked} onChange={event => update(active.id, { size: Number(event.target.value) })} /></label>
          <label>회전<input aria-label="선택 스티커 회전" type="range" min="-180" max="180" step="5" value={active.rotation ?? 0} disabled={blocked} onChange={event => update(active.id, { rotation: Number(event.target.value) })} /></label>
          <button disabled={blocked} onClick={() => { setItems(current => current.filter(item => item.id !== active.id)); setSelected(undefined); setDirty(true) }}>선택 스티커 제거</button>
        </div>}
      </>}
      <button disabled={blocked || !dirty} onClick={() => void save()}>{busy ? '처리 중…' : '꾸미기 저장'}</button>
      {dirty && <small>저장 전 · 날짜를 바꾸거나 닫기 전에 저장해주세요.</small>}
      {message && <p role="status">{message}</p>}
    </div>
    <div className={styles.viewport}>
      <div className={styles.surface} ref={surface}>
        {children}
        <div className={styles.overlay} style={{ pointerEvents: mode ? 'auto' : 'none' }}>
          {items.map((item, index) => <button key={item.id} disabled={blocked} tabIndex={mode ? 0 : -1} aria-label={`스티커 ${index + 1} 선택 및 이동`} className={`${styles.sticker} ${selected === item.id && mode ? styles.selected : ''}`} style={{ left: `${(item.x ?? 0.5) * 100}%`, top: `${(item.y ?? 0.28) * 100}%`, width: item.size, height: item.size, transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)` }}
            onClick={() => setSelected(item.id)}
            onPointerDown={event => { if (!mode || blocked) return; event.preventDefault(); setSelected(item.id); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: item.id, x: item.x ?? 0.5, y: item.y ?? 0.28, clientX: event.clientX, clientY: event.clientY } }}
            onPointerMove={event => { const start = drag.current; const area = surface.current; if (!start || start.id !== item.id || !area) return; update(item.id, { x: Math.max(0.1, Math.min(0.9, start.x + (event.clientX - start.clientX) / area.clientWidth)), y: Math.max(0.04, Math.min(0.96, start.y + (event.clientY - start.clientY) / area.clientHeight)) }) }}
            onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
            onKeyDown={event => { const moves: Record<string, [number, number]> = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }; const move = moves[event.key]; if (!mode || !move) return; event.preventDefault(); update(item.id, { x: Math.max(0.1, Math.min(0.9, (item.x ?? 0.5) + move[0])), y: Math.max(0.04, Math.min(0.96, (item.y ?? 0.28) + move[1])) }) }}>
            {item.image ? <img draggable={false} src={item.image} alt="" /> : <span style={{ fontSize: item.size * 0.8 }}>{item.emoji}</span>}
          </button>)}
        </div>
      </div>
    </div>
  </>
}
