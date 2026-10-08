import styles from './App.module.css'

function App() {
  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <span className={styles.dots} aria-hidden="true">● ● ●</span>
        <span>my little corner of the internet</span>
        <span className={styles.label}>준비 중</span>
      </header>
      <div className={styles.layout}>
        <section className={styles.content}>
          <p className={styles.eyebrow}>돌쇠의 작은 기록방</p>
          <h1>memo.zip</h1>
          <p>까먹어도 괜찮아, 여기 적어두면 돼.</p>
          <div className={styles.paper}>
            <h2>하루하루, 차곡차곡</h2>
            <p>일정과 메모, 작은 성취가 모일 공간이에요.</p>
            <p className={styles.note}>개발 환경 설정이 완료되었습니다.<br />플래너 기능은 다음 단계에서 만들어갑니다.</p>
          </div>
        </section>
        <aside className={styles.sidebar} aria-label="할 일 패널 미리보기">
          <h2>돌쇠야, 적어!</h2>
          <p>할 일과 하루 메모가 들어올 자리</p>
          <div className={styles.empty}>기억나는 건<br />일단 적어두자 ♡</div>
          <p className={styles.note}>현재는 초기 화면입니다.<br />아직 기록 입력 기능은 없어요.</p>
        </aside>
      </div>
      <footer className={styles.footer}>오늘의 작은 기록이 내일의 나를 도와줄 거야.</footer>
    </main>
  )
}

export default App
