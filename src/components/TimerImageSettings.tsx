import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { timerImageRepository } from '../repositories/timerImageRepository'
import { moodLabels, type TimerImages, type TimerMood } from '../types/timerImages'
import { TimerCharacter } from './TimerCharacter'
import styles from './WorkTimer.module.css'

const moods: TimerMood[] = ['idle', 'running', 'paused']
export function TimerImageSettings({ mood }: { mood: TimerMood }) {
  const [images, setImages] = useState<TimerImages['images']>({})
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(() => timerImageRepository.read()).subscribe({
      next: value => { setImages(value?.images ?? {}); setReady(true) },
      error: () => setError('캐릭터 설정을 불러오지 못했어요. 새로고침해주세요.'),
    })
    return () => subscription.unsubscribe()
  }, [])
  async function save(target: TimerMood, file?: File) {
    if (busy || !ready) return
    setBusy(true); setMessage(''); setError('')
    try {
      let source: string | undefined
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) {
          throw new Error('PNG·JPG·WebP·GIF 이미지를 2MB 이하로 선택해주세요.')
        }
        source = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'))
          reader.readAsDataURL(file)
        })
        await new Promise<void>((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(); image.onerror = () => reject(new Error('열 수 없는 이미지예요. 다른 파일을 선택해주세요.'))
          image.src = source!
        })
      }
      await timerImageRepository.save(target, source)
      setMessage(`${moodLabels[target]} 이미지를 ${file ? '저장했어요.' : '기본 캐릭터로 바꿨어요.'}`)
    } catch (failure) { setError(failure instanceof Error && /이미지|파일/.test(failure.message) ? failure.message : '이미지를 저장하지 못했어요. 다시 시도해주세요.') }
    finally { setBusy(false) }
  }
  return <>
    <TimerCharacter mood={mood} source={images[mood]} />
    <details className={styles.imageSettings}><summary>캐릭터 이미지 설정</summary>
      <p className={styles.note}>상태별 PNG·JPG·WebP·GIF, 최대 2MB. 이 브라우저에 저장돼요.</p>
      {moods.map(target => <div key={target} className={styles.imageSetting}>
        <TimerCharacter mood={target} source={images[target]} />
        <label>{moodLabels[target]} 이미지<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy || !ready} onChange={event => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void save(target, file)
        }} /></label>
        {images[target] && <button type="button" disabled={busy} onClick={() => void save(target)}>기본 {moodLabels[target]} 이미지로 변경</button>}
      </div>)}
      {message && <p role="status" className={styles.note}>{message}</p>}
    </details>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </>
}
