import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
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
  const transform = useRef<{ id: string; kind: 'size' | 'rotation'; cx: number; cy: number; distance: number; angle: number; size: number; rotation: number } | null>(null)
  function beginTransform(event: PointerEvent<HTMLButtonElement>, item: MemoSticker, kind: 'size' | 'rotation') {
    if (blocked) return
    event.preventDefault(); event.stopPropagation()
    const box = event.currentTarget.parentElement!.getBoundingClientRect()
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2
    transform.current = { id: item.id, kind, cx, cy, distance: Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy)), angle: Math.atan2(event.clientY - cy, event.clientX - cx), size: item.size, rotation: item.rotation ?? 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveTransform(event: PointerEvent<HTMLButtonElement>) {
    const start = transform.current
    if (!start) return
    if (start.kind === 'size') update(start.id, { size: Math.round(Math.max(40, Math.min(240, start.size * Math.hypot(event.clientX - start.cx, event.clientY - start.cy) / start.distance))) })
    else {
      const degrees = start.rotation + (Math.atan2(event.clientY - start.cy, event.clientX - start.cx) - start.angle) * 180 / Math.PI
      update(start.id, { rotation: Math.round(((degrees + 180) % 360 + 360) % 360 - 180) })
    }
  }
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
        <p>스티커 선택 → 모서리 ↘로 크기 조절 · 위쪽 ↻로 회전. 방향키로도 조절할 수 있어요.</p>
        {active && <div className={styles.controls}>
          <button disabled={blocked} onClick={() => { setItems(current => current.filter(item => item.id !== active.id)); setSelected(undefined); setDirty(true) }}>선택 스티커 제거</button>
        </div>}
      </>}
      <button disabled={blocked || !dirty} onClick={() => void save()}>{busy ? '처리 중…' : '꾸미기 저장'}</button>
      <small style={{ visibility: dirty ? 'visible' : 'hidden' }}>저장 전 · 날짜를 바꾸거나 닫기 전에 저장해주세요.</small>
      <p role="status" style={{ minHeight: '1.5em' }}>{message}</p>
    </div>
    <div className={styles.viewport}>
      <div className={styles.surface} ref={surface}>
        {children}
        <div className={styles.overlay} style={{ pointerEvents: mode ? 'auto' : 'none' }}>
          {items.map((item, index) => <div key={item.id} className={`${styles.sticker} ${selected === item.id && mode ? styles.selected : ''}`} style={{ left: `${(item.x ?? 0.5) * 100}%`, top: `${(item.y ?? 0.28) * 100}%`, width: item.size, height: item.size, transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)` }}>
            <button className={styles.move} disabled={blocked} tabIndex={mode ? 0 : -1} aria-label={`스티커 ${index + 1} 선택 및 이동`}
            onClick={() => setSelected(item.id)}
            onPointerDown={event => { if (!mode || blocked) return; event.preventDefault(); setSelected(item.id); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: item.id, x: item.x ?? 0.5, y: item.y ?? 0.28, clientX: event.clientX, clientY: event.clientY } }}
            onPointerMove={event => { const start = drag.current; const area = surface.current; if (!start || start.id !== item.id || !area) return; update(item.id, { x: Math.max(0.1, Math.min(0.9, start.x + (event.clientX - start.clientX) / area.clientWidth)), y: Math.max(0.04, Math.min(0.96, start.y + (event.clientY - start.clientY) / area.clientHeight)) }) }}
            onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
            onKeyDown={event => { const moves: Record<string, [number, number]> = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }; const move = moves[event.key]; if (!mode || !move) return; event.preventDefault(); update(item.id, { x: Math.max(0.1, Math.min(0.9, (item.x ?? 0.5) + move[0])), y: Math.max(0.04, Math.min(0.96, (item.y ?? 0.28) + move[1])) }) }}>
            {item.image ? <img draggable={false} src={item.image} alt="" /> : <span style={{ fontSize: item.size * 0.8 }}>{item.emoji}</span>}
            </button>
            {mode && selected === item.id && <>
              {(['rotation', 'size'] as const).map(kind => <button key={kind} className={`${styles.handle} ${kind === 'size' ? styles.resize : styles.rotate}`} disabled={blocked} aria-label={`스티커 ${index + 1} ${kind === 'size' ? '크기 조절' : '회전 조절'}`} title={kind === 'size' ? '드래그로 크기 조절' : '드래그로 회전'}
                onPointerDown={event => beginTransform(event, item, kind)} onPointerMove={moveTransform} onPointerUp={() => { transform.current = null }} onPointerCancel={() => { transform.current = null }} onLostPointerCapture={() => { transform.current = null }}
                onKeyDown={event => { if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return; event.preventDefault(); const direction = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1; update(item.id, kind === 'size' ? { size: Math.max(40, Math.min(240, item.size + direction * 8)) } : { rotation: (item.rotation ?? 0) + direction * 5 }) }}>{kind === 'size' ? '↘' : '↻'}</button>)}
            </>}
          </div>)}
        </div>
      </div>
    </div>
  </>
}
