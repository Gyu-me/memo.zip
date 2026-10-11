import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { liveQuery } from "dexie";
import { taskRepository } from "./repositories/taskRepository";
import { dateKey, fromDateKey, monthDays, weekDays, shiftDate } from "./lib/calendar";
import type { Task, TaskSeries, RepeatRule, RepeatScope } from "./types/task";
import { repeatDescription } from './lib/recurrence';
import { seriesGroup } from './lib/seriesChanges';
import styles from "./App.module.css";
import { DayTimeline } from "./components/DayTimeline";
import { Popup } from "./components/Popup";
import { WeekTimeline } from "./components/WeekTimeline";
import { relocateTask, type ScheduleDrag } from './lib/scheduleDrag';
import { WorkTimer } from './components/WorkTimer';

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
  const [initialLoading, setLoading] = useState(true);
  const [loadedWindow, setLoadedWindow] = useState('');
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [category, setCategory] = useState("pink");
  const [editing, setEditing] = useState<string | null>(null);
  const [series, setSeries] = useState<TaskSeries[]>([]);
  const [repeat, setRepeat] = useState<'none' | RepeatRule['frequency']>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState('');
  const [monthDay, setMonthDay] = useState(1);
  const [scope, setScope] = useState<RepeatScope>('one');
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [deleteScope, setDeleteScope] = useState<RepeatScope>('one');
  const editingTask = tasks.find(task => task.id === editing);
  const editingSeries = series.find(item => item.id === editingTask?.seriesId);
  const monthDates = monthDays(month);
  const selectedWeek = weekDays(selected);
  const windowStart = [dateKey(monthDates[0]), dateKey(selectedWeek[0])].sort()[0];
  const windowEnd = [dateKey(monthDates[monthDates.length - 1]), dateKey(selectedWeek[6])].sort().at(-1)!;
  const loading = initialLoading || loadedWindow !== `${windowStart}/${windowEnd}`;

  useEffect(() => {
    const interval = window.setInterval(
      () => setToday(dateKey(new Date())),
      60_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = liveQuery(() => taskRepository.listAll(windowStart, windowEnd)).subscribe({
      next: (records) => {
        setTasks(records.tasks);
        setSeries(records.series);
        setLoadedWindow(`${windowStart}/${windowEnd}`);
        setLoading(false);
      },
      error: () => {
        setLoadedWindow(`${windowStart}/${windowEnd}`);
        setError(
          "기록을 읽지 못했어요. 브라우저 저장 권한을 확인하고 새로고침해주세요.",
        );
        setLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, [windowStart, windowEnd]);

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
    setRepeat('none'); setUntil(''); setWeekdays([]);
    setScope('one');
  };

  const openEditor = (task?: Task, range?: { start: string; end: string }, date = task?.date ?? selected) => {
    clearForm();
    setDraftDate(date);
    setWeekdays([fromDateKey(date).getDay()]);
    setMonthDay(fromDateKey(date).getDate());
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

  const selectScope = (value: RepeatScope) => {
    if (!editingTask || !editingSeries) return;
    setScope(value);
    const group = seriesGroup(series, editingSeries);
    const source = value === 'all' ? group[0] : editingSeries;
    const content = value === 'one' ? editingTask : source.template;
    setTitle(content.title); setMemo(content.memo ?? ''); setCategory(content.categoryId ?? 'pink');
    setStart(content.startTime ?? ''); setEnd(content.endTime ?? '');
    setDraftDate(value === 'one' ? editingTask.date : value === 'all' ? group[0].template.date : editingTask.occurrenceDate ?? editingTask.date);
    setRepeat(value === 'one' ? 'none' : source.rule.frequency);
    setWeekdays([...source.rule.weekdays]);
    setMonthDay(source.rule.monthDay ?? fromDateKey(source.template.date).getDate());
    // Whole-group edits use the final segment's end, rather than a split boundary.
    setUntil(value === 'one' ? '' : group[group.length - 1].rule.until ?? '');
    setError('');
  };

  async function deleteSelected() {
    if (!deleting || busy) return;
    const saved = await mutate(() => deleteScope === 'one' ? taskRepository.remove(deleting)
      : taskRepository.changeSeries(deleting, deleteScope));
    if (saved) { setDeleting(null); setNotice('선택한 범위의 일정을 삭제했어요.'); }
  }

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
    const bulkEdit = !!original?.seriesId && scope !== 'one';
    if (bulkEdit && (repeat === 'none' || (scope === 'following' && draftDate < (original.occurrenceDate ?? original.date)))) {
      setError('반복 주기를 선택하고, 이후 일정의 시작일은 선택한 회차 이후로 설정해주세요.'); return;
    }
    if (repeat !== 'none' && ((until && until < draftDate) || (repeat === 'weekly' && !weekdays.length))) {
      setError('종료일은 시작일 이후로 설정하고, 매주 반복은 요일을 하나 이상 선택해주세요.'); return;
    }
    if (repeat === 'monthly' && (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31)) {
      setError('매월 반복 날짜는 1일부터 31일 사이로 입력해주세요.'); return;
    }
    const task: Task = {
      ...original,
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
    const saved = await mutate(() => bulkEdit && original
      ? taskRepository.changeSeries(original, scope as 'following' | 'all', {
        id: crypto.randomUUID(), template: task,
        rule: { frequency: repeat as RepeatRule['frequency'], weekdays: [...weekdays].sort(), monthDay: repeat === 'monthly' ? monthDay : undefined, until: until || undefined },
      }) : !editing && repeat !== 'none'
      ? taskRepository.saveSeries({ id: task.id, template: task, rule: { frequency: repeat, weekdays: [...weekdays].sort(), monthDay: repeat === 'monthly' ? monthDay : undefined, until: until || undefined } })
      : taskRepository.save(task));
    if (saved) { selectDate(draftDate); clearForm(); setEditorOpen(false); setNotice(repeat !== 'none' ? '반복 일정을 등록했어요.' : '일정을 저장했어요.'); }
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
            onToggle={(task) => { selectDate(task.date); void mutate(() => taskRepository.setCompleted(task, !task.completed)); }}
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
                        {task.seriesId ? '↻ ' : ''}{task.title}
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
                        taskRepository.setCompleted(task, !task.completed),
                      )
                    }
                  />
                  <span>
                    <span>{task.title}</span>
                    {task.seriesId && <small>↻ {series.find(item => item.id === task.seriesId) ? repeatDescription(series.find(item => item.id === task.seriesId)!) : '반복 일정'} · 이번 회차</small>}
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
                      if (task.seriesId) { setDeleting(task); setDeleteScope('one'); setError(''); return; }
                      if (window.confirm(`“${task.title}”${task.seriesId ? '의 이번 회차' : ''}를 삭제할까요?`))
                        void mutate(() => taskRepository.remove(task)).then(
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
          <WorkTimer date={selected} tasks={daily} />
        </aside>
      </div>
      {dayOpen && <Popup title={`${selected} 하루 일정`} busy={busy} onClose={() => setDayOpen(false)}>
        <div className={styles.popupNav}><button onClick={() => { const date = fromDateKey(selected); date.setDate(date.getDate() - 1); selectDate(dateKey(date)); }}>이전 날</button><button onClick={() => { const date = fromDateKey(selected); date.setDate(date.getDate() + 1); selectDate(dateKey(date)); }}>다음 날</button><button onClick={() => openEditor()}>+ 할 일 추가</button></div>
        <DayTimeline {...dragProps} date={selected} tasks={daily} disabled={busy || loading} colorOf={colorOf} onToggle={(task) => void mutate(() => taskRepository.setCompleted(task, !task.completed))} onSelectRange={(start, end) => openEditor(undefined, { start, end })} onEdit={(task) => openEditor(task)} />
      </Popup>}
      {editorOpen && <Popup title={editing ? '할 일 수정' : '할 일 작성'} busy={busy} onClose={() => { clearForm(); setEditorOpen(false); }}>
        <label className={styles.dateField}>{editingSeries && scope !== 'one' ? '반복 시작일' : '일정 날짜'}<input type="date" value={draftDate} disabled={busy} onInput={(e) => { setDraftDate(e.currentTarget.value); if (e.currentTarget.value && !editing) setMonthDay(fromDateKey(e.currentTarget.value).getDate()); }} required form="task-form" /></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
          <form id="task-form" onSubmit={submit} className={styles.form}>
            {editingSeries && <fieldset disabled={busy} className={styles.repeat}>
              <legend>수정 적용 범위</legend>
              <label>적용 범위<select aria-label="수정 적용 범위" value={scope} onChange={event => selectScope(event.target.value as RepeatScope)}>
                <option value="one">이번 일정만</option><option value="following">이번부터 이후 일정</option><option value="all">전체 반복 일정</option>
              </select></label>
              <p className={styles.note}>{scope === 'one' ? '이번 회차만 수정합니다. 드래그 이동도 이번 회차에만 적용돼요.' : '범위를 바꾸면 해당 반복 규칙의 내용으로 입력창이 바뀝니다. 완료한 기록은 유지하고, 미완료 일정에 새 내용을 적용해요.'}</p>
            </fieldset>}
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
            {(!editing || (editingSeries && scope !== 'one')) && <fieldset disabled={busy} className={styles.repeat}>
              <legend>반복 일정</legend>
              <label>반복 주기<select value={repeat} onChange={event => setRepeat(event.target.value as typeof repeat)}>
                {!editing && <option value="none">반복 안 함</option>}<option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option>
              </select></label>
              {repeat === 'weekly' && <div className={styles.repeatDays} role="group" aria-label="반복 요일">
                {[1, 2, 3, 4, 5, 6, 0].map(day => <label key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={event => setWeekdays(event.target.checked ? [...weekdays, day] : weekdays.filter(value => value !== day))} />{['일', '월', '화', '수', '목', '금', '토'][day]}</label>)}
              </div>}
              {repeat === 'monthly' && <label>매월 반복 날짜<input type="number" min="1" max="31" required value={monthDay} onInput={event => setMonthDay(Number(event.currentTarget.value))} /></label>}
              {repeat !== 'none' && <><label>반복 종료일 (선택)<input type="date" min={draftDate} value={until} onInput={event => setUntil(event.currentTarget.value)} /></label><p className={styles.note}>비우면 계속 반복하며, 종료일 당일까지 포함해요.{repeat === 'monthly' && ' 해당 날짜가 없는 달은 마지막 날에 표시해요.'}</p></>}
            </fieldset>}
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
{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setScope('one'); setRepeat('none'); setUntil(''); setNotice("복사할 내용을 확인하고 저장해주세요."); }}>복제해서 새 일정 작성</button>}
            {editing && (
              <button type="button" onClick={() => { clearForm(); setEditorOpen(false); }} disabled={busy}>
                수정 취소
              </button>
            )}
          </form>
      </Popup>}
      {deleting && <Popup title="반복 일정 삭제" busy={busy} onClose={() => setDeleting(null)}>
        <p>“{deleting.title}”을 어느 범위에서 삭제할까요?</p>
        <label className={styles.dateField}>삭제 적용 범위<select aria-label="삭제 적용 범위" value={deleteScope} disabled={busy} onChange={event => setDeleteScope(event.target.value as RepeatScope)}>
          <option value="one">이번 일정만</option><option value="following">이번부터 이후 일정</option><option value="all">전체 반복 일정</option>
        </select></label>
        <p className={styles.note}>{deleteScope === 'one' ? '다른 회차는 유지됩니다.' : deleteScope === 'following' ? `${deleting.occurrenceDate ?? deleting.date}부터 반복을 중단하고 해당 범위의 기록을 삭제합니다. 이전 기록은 유지됩니다.` : '이 반복 그룹의 완료 기록과 개별 수정 기록도 모두 삭제합니다.'}</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.popupNav}><button disabled={busy} onClick={() => void deleteSelected()}>{busy ? '삭제 중…' : '선택한 범위 삭제'}</button><button disabled={busy} onClick={() => setDeleting(null)}>취소</button></div>
      </Popup>}
      <footer className={styles.footer}>
        까먹어도 괜찮아, 여기 적어두면 돼.
      </footer>
    </main>
  );
}

export default App;
