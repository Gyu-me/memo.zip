export function timeMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function dragRange(anchor: number, current: number) {
  const first = Math.max(0, Math.min(47, anchor))
  const last = Math.max(0, Math.min(47, current))
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return { start: format(Math.min(first, last) * 30), end: format((Math.max(first, last) + 1) * 30) }
}

interface TimedItem { id: string; startTime?: string; endTime?: string }

// Connected overlapping intervals share columns; touching intervals do not overlap.
export function timelineLayout<T extends TimedItem>(tasks: T[]) {
  const items = tasks.filter((task) => task.startTime && task.endTime)
    .map((task) => ({ task, start: timeMinutes(task.startTime!), end: timeMinutes(task.endTime!), column: 0, columns: 1 }))
    .filter((item) => item.start >= 0 && item.end <= 1440 && item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end || a.task.id.localeCompare(b.task.id))
  let group: typeof items = []
  let laneEnds: number[] = []
  let groupEnd = -1
  const finish = () => { for (const item of group) item.columns = laneEnds.length }
  for (const item of items) {
    if (item.start >= groupEnd) { finish(); group = []; laneEnds = []; groupEnd = -1 }
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = laneEnds.length
    item.column = lane
    // Minimum visual height is 30 minutes, so short blocks also get separate lanes.
    const visualEnd = Math.min(1440, Math.max(item.end, item.start + 30))
    laneEnds[lane] = visualEnd
    groupEnd = Math.max(groupEnd, visualEnd)
    group.push(item)
  }
  finish()
  return items
}
