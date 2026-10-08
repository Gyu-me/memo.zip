import { useLayoutEffect, useRef, type ReactNode } from 'react'
import styles from './Popup.module.css'

export function Popup({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    element.querySelector<HTMLInputElement>('input')?.focus()
    return () => element.close()
  }, [])
  return <dialog className={styles.popup} ref={dialog} aria-label={title}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <header><h2>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label={`${title} 닫기`}>닫기 ×</button></header>
    {children}
  </dialog>
}
