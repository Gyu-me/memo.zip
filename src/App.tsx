import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { liveQuery } from "dexie";
import { taskRepository } from "./repositories/taskRepository";
import { dateKey, fromDateKey, monthDays, weekDays, shiftDate } from "./lib/calendar";
import type { Task } from "./types/task";
import styles from "./App.module.css";
import { DayTimeline } from "./components/DayTimeline";
import { Popup } from "./components/Popup";
import { WeekTimeline } from "./components/WeekTimeline";
import { relocateTask, type ScheduleDrag } from './lib/scheduleDrag';

const palette = [
  { id: "pink", name: "분홍", color: "#eaaac1" },
  { id: "peach", name: "피치", color: "#edb29b" },
  { id: "yellow", name: "노랑", color: "#edd084" },
  { id: "mint", name: "민트", color: "#c7f1d5" },
  { id: "blue", name: "하늘", color: "#c1d9f4" },
  { id: "purple", name: "라벤더", color: "#beaae7" },
];
const colorOf = (task: Task) =>
  palette.find((item) => item.id === task.categoryId)?.color ??
  palette[0].color;

function App() {
  const [today, setToday] = useState(() => dateKey(new Date()));
  const [selected, setSelected] = useState(today);
  const [draftDate, setDraftDate] = useState(today);
  const [activeDrag, setActiveDrag] = useState<ScheduleDrag | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'month' | 'week'>('month');
  const [dayOpen, setDayOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState("pink");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(
      () => setToday(dateKey(new Date())),
      60_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = liveQuery(() => taskRepository.listAll()).subscribe({
      next: (records) => {
        setTasks(records);
        setLoading(false);
      },
      error: () => {
        setError(
          "기록을 읽지 못했어요. 브라우저 저장 권한을 확인하고 새로고침해주세요.",
        );
        setLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  const daily = tasks
    .filter((task) => task.date === selected)
    .sort(
      (a, b) =>
        (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const completed = daily.filter((task) => task.completed).length;
  const week = weekDays(selected);
  const clearForm = () => {
    setTitle("");
    setStart("");
    setEnd("");
    setEditing(null);
    setMemo('');
  };

  const openEditor = (task?: Task, range?: { start: string; end: string }, date = task?.date ?? selected) => {
    clearForm();
    setDraftDate(date);
    setTitle(task?.title ?? ''); setMemo(task?.memo ?? '');
    setStart(task?.startTime ?? range?.start ?? ''); setEnd(task?.endTime ?? range?.end ?? '');
    setCategory(task?.categoryId ?? 'pink'); setEditing(task?.id ?? null);
    setError(''); setEditorOpen(true);
  };
  const selectDate = (key: string) => {
    setSelected(key);
    const date = fromDateKey(key);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    clearForm();
  };

  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch {
      setError("저장하지 못했어요. 입력 내용은 유지되니 다시 시도해주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function dropTask(task: Task, date: string, copy: boolean, range?: { start: string; end: string }) {
    setActiveDrag(null); setDropDate(null);
    if (busy || loading) return;
    const original = tasks.find((record) => record.id === task.id);
    if (!original) return;
    if (!copy && original.date === date && (!range || (range.start === original.startTime && range.end === original.endTime))) return;
    if (await mutate(() => taskRepository.save(relocateTask(original, date, copy, crypto.randomUUID(), new Date().toISOString(), range)))) {
      selectDate(date); setNotice(copy ? '일정을 미완료 상태로 복제했어요.' : '일정을 이동했어요.');
    }
  }
  const dragProps = {
    activeDrag,
    onDragStart: (task: Task, offset: number) => { setActiveDrag({ task, offset }); setNotice(''); },
    onDragEnd: () => { setActiveDrag(null); setDropDate(null); },
    onDropTask: (task: Task, date: string, copy: boolean, range?: { start: string; end: string }) => { void dropTask(task, date, copy, range); },
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("할 일을 입력해주세요.");
      return;
    }
    const validStart = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const validEnd = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
    if ((start && !end) || (!start && end) || (start && end && (!validStart.test(start) || !validEnd.test(end) || end <= start))) {
      setError(
        "시작과 종료 시간을 함께 입력하고 종료를 시작보다 늦게 설정해주세요.",
      );
      return;
    }
    const original = tasks.find((task) => task.id === editing);
    const task: Task = {
      id: original?.id ?? crypto.randomUUID(),
      title: title.trim(),
      memo: memo.trim() || undefined,
      date: draftDate,
      startTime: start || undefined,
      endTime: end || undefined,
      categoryId: category,
      completed: original?.completed ?? false,
      createdAt: original?.createdAt ?? new Date().toISOString(),
    };
    if (await mutate(() => taskRepository.save(task))) { selectDate(draftDate); clearForm(); setEditorOpen(false); setNotice('일정을 저장했어요.'); }
  }

  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <span className={styles.dots} aria-hidden="true">
          ● ● ●
        </span>
        <span>memo.zip / my little corner</span>
        <span className={styles.label}>나의 기록방 ♡</span>
      </header>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>돌쇠의 작은 기록방</p>
          <h1>memo.zip</h1>
        </div>
        <nav className={styles.monthNav} aria-label="날짜 이동">
          <button
            aria-label={view === 'month' ? '이전 달' : '이전 주'}
            onClick={() =>
              view === 'month' ? setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)) : selectDate(shiftDate(selected, -7))
            }
          >
            ‹
          </button>
          <h2>
            {view === 'month' ? `${month.getFullYear()}년 ${month.getMonth() + 1}월` : `${dateKey(week[0])} ~ ${dateKey(week[6])}`}
          </h2>
          <button
            aria-label={view === 'month' ? '다음 달' : '다음 주'}
            onClick={() =>
              view === 'month' ? setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)) : selectDate(shiftDate(selected, 7))
            }
          >
            ›
          </button>
          <button onClick={() => selectDate(dateKey(new Date()))}>오늘</button>
        </nav>
      </div>
      <nav className={styles.viewTabs} aria-label="일정 보기">
        <button aria-pressed={view === 'month'} onClick={() => setView('month')}>월간</button>
        <button aria-pressed={view === 'week'} onClick={() => setView('week')}>주간</button>
      </nav>
      <p className={styles.note}>일정을 드래그하면 이동 · Ctrl/Command를 누르고 놓으면 복제</p>
      {notice && <p role="status" className={styles.note}>{notice}</p>}
      <div className={styles.layout}>
        <section className={styles.content} aria-label={view === 'month' ? '월간 캘린더' : '주간 플래너'}>
          <div className={styles.banner}>
            <span>dear my days</span>
            <h2>기억나는 건, 일단 적어두자.</h2>
            <p>작은 할 일도 차곡차곡 모아두는 곳 ✿</p>
          </div>
          {view === 'week' ? <WeekTimeline {...dragProps} selected={selected} today={today} tasks={tasks} disabled={busy || loading} colorOf={colorOf}
            onSelectDate={selectDate}
            onSelectRange={(date, start, end) => { selectDate(date); openEditor(undefined, { start, end }, date); }}
            onEdit={(task) => { selectDate(task.date); openEditor(task); }}
            onToggle={(task) => { selectDate(task.date); void mutate(() => taskRepository.setCompleted(task.id, !task.completed)); }}
          /> : <div className={styles.calendar}>
            {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
              <div className={styles.weekday} key={day}>
                {day}
              </div>
            ))}
            {monthDays(month).map((date) => {
              const key = dateKey(date);
              const entries = tasks.filter((task) => task.date === key);
              return (
                <div
                  key={key}
                  className={`${styles.day} ${date.getMonth() !== month.getMonth() ? styles.outside : ""} ${selected === key ? styles.selected : ""} ${activeDrag && dropDate === key ? styles.dropTarget : ''}`}
                  onDragOver={(event) => { if (!activeDrag || busy) return; event.preventDefault(); event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move'; setDropDate(key); }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropDate(null); }}
                  onDrop={(event) => { event.preventDefault(); if (activeDrag) void dropTask(activeDrag.task, key, event.ctrlKey || event.metaKey); }}
                >
                  <button aria-label={`${key} 하루 시간표 열기`} className={styles.dateButton}
                    onClick={() => { selectDate(key); setDayOpen(true); }}
                  >
                    <span className={key === today ? styles.today : styles.dayNumber}>{date.getDate()}</span>
                  </button>
                  <span className={styles.entries}>
                    {entries.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        draggable={!busy && !loading}
                        onDragStart={(event) => { event.dataTransfer.setData('application/x-memo-task', task.id); event.dataTransfer.effectAllowed = 'copyMove'; dragProps.onDragStart(task, 0); }}
                        onDragEnd={dragProps.onDragEnd}
                        aria-label={`${task.title} 하루 시간표 열기`}
                        onClick={() => { selectDate(key); setDayOpen(true); }}
                        className={`${styles.event} ${task.completed ? styles.done : ""}`}
                        style={
                          { "--task-color": colorOf(task) } as CSSProperties
                        }
                      >
                        {task.completed ? "✓ " : ""}
                        {task.startTime ? `${task.startTime} ` : ""}
                        {task.title}
                      </button>
                    ))}
                    {entries.length > 3 && (
                      <span className={styles.more}>
                        +{entries.length - 3}개 더
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>}
        </section>
        <aside className={styles.sidebar} aria-label="선택 날짜 할 일">
          <div className={styles.character} aria-hidden="true">
            ✿
          </div>
          <p className={styles.eyebrow}>
            {fromDateKey(selected).toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
          <h2>돌쇠야, 적어!</h2>
          <p className={styles.progress}>
            {completed} / {daily.length}개 완료
          </p>
          {loading && <p role="status">기록을 불러오는 중…</p>}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
<button className={styles.primary} disabled={busy || loading} onClick={() => openEditor()}>+ 할 일 추가</button><button onClick={() => setDayOpen(true)}>하루 시간표 열기</button>
          <ul className={styles.taskList}>
            {daily.map((task) => (
              <li
                key={task.id}
                className={task.completed ? styles.completedTask : ""}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={busy || loading}
                    onChange={() =>
                      void mutate(() =>
                        taskRepository.setCompleted(task.id, !task.completed),
                      )
                    }
                  />
                  <span>
                    <span>{task.title}</span>
                    {task.startTime && (
                      <small>
                        {task.startTime}–{task.endTime}
                      </small>
                    )}
                  </span>
                </label>
                <div className={styles.actions}>
                  <button
                    aria-label={`${task.title} 수정`}
                    disabled={busy}
                    onClick={() => { setDayOpen(true); openEditor(task); }}
                  >
                    수정
                  </button>
                  <button
                    aria-label={`${task.title} 삭제`}
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`“${task.title}”을 삭제할까요?`))
                        void mutate(() => taskRepository.remove(task.id)).then(
                          (saved) => {
                            if (saved && editing === task.id) clearForm();
                          },
                        );
                    }}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!loading && !daily.length && (
            <p className={styles.empty}>
              아직 적어둔 할 일이 없어요.
              <br />
              오늘의 첫 기록을 남겨보세요 ♡
            </p>
          )}
          <p className={styles.note}>기록은 이 브라우저에 저장돼요.</p>
        </aside>
      </div>
      {dayOpen && <Popup title={`${selected} 하루 일정`} busy={busy} onClose={() => setDayOpen(false)}>
        <div className={styles.popupNav}><button onClick={() => { const date = fromDateKey(selected); date.setDate(date.getDate() - 1); selectDate(dateKey(date)); }}>이전 날</button><button onClick={() => { const date = fromDateKey(selected); date.setDate(date.getDate() + 1); selectDate(dateKey(date)); }}>다음 날</button><button onClick={() => openEditor()}>+ 할 일 추가</button></div>
        <DayTimeline {...dragProps} date={selected} tasks={daily} disabled={busy || loading} colorOf={colorOf} onToggle={(task) => void mutate(() => taskRepository.setCompleted(task.id, !task.completed))} onSelectRange={(start, end) => openEditor(undefined, { start, end })} onEdit={(task) => openEditor(task)} />
      </Popup>}
      {editorOpen && <Popup title={editing ? '할 일 수정' : '할 일 작성'} busy={busy} onClose={() => { clearForm(); setEditorOpen(false); }}>
        <label className={styles.dateField}>일정 날짜<input type="date" value={draftDate} disabled={busy} onInput={(e) => setDraftDate(e.currentTarget.value)} required form="task-form" /></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
          <form id="task-form" onSubmit={submit} className={styles.form}>
            <label htmlFor="task-title">
              {editing ? "할 일 수정" : "새로운 할 일"}
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="까먹기 전에 적어두기"
              required
              disabled={busy || loading}
            />
            <label htmlFor="task-memo">메모</label><textarea id="task-memo" value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} maxLength={5000} disabled={busy} placeholder="기억해둘 내용을 적어주세요" /><div className={styles.times}>
              <label>
                시작 (선택)
                <input
                  type="text" inputMode="numeric" placeholder="HH:mm" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00"
                  value={start}
                  onInput={(e) => setStart(e.currentTarget.value)}
                  disabled={busy}
                />
              </label>
              <label>
                종료 (선택)
                <input
                  type="text" inputMode="numeric" placeholder="HH:mm" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00"
                  value={end}
                  onInput={(e) => setEnd(e.currentTarget.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <fieldset disabled={busy}>
              <legend>일정 색상</legend>
              <div className={styles.swatches}>
                {palette.map((item) => (
                  <label
                    key={item.id}
                    title={item.name}
                    style={{ "--task-color": item.color } as CSSProperties}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={item.id}
                      checked={category === item.id}
                      onChange={() => setCategory(item.id)}
                      aria-label={item.name}
                    />
                    <span aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <button className={styles.primary} disabled={busy || loading}>
              {busy ? "저장 중…" : editing ? "수정 저장" : "+ 할 일 추가"}
            </button>
{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setNotice("복사할 내용을 확인하고 저장해주세요."); }}>복제해서 새 일정 작성</button>}
            {editing && (
              <button type="button" onClick={() => { clearForm(); setEditorOpen(false); }} disabled={busy}>
                수정 취소
              </button>
            )}
          </form>
      </Popup>}
      <footer className={styles.footer}>
        까먹어도 괜찮아, 여기 적어두면 돼.
      </footer>
    </main>
  );
}

export default App;
