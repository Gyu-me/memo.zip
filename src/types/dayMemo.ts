export interface DayMemo {
  date: string
  content: string
  stickers?: MemoSticker[]
}

export interface MemoSticker {
  id: string
  image?: string
  emoji?: string
  size: number
  x?: number
  y?: number
  rotation?: number
}
