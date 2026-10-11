import { moodLabels, type TimerMood } from '../types/timerImages'
import styles from './TimerCharacter.module.css'

export function TimerCharacter({ mood, source }: { mood: TimerMood; source?: string }) {
  return <div className={styles.frame} data-mood={mood}>
    {source ? <img className={styles.image} src={source} alt={`${moodLabels[mood]} 캐릭터`} /> :
      <svg viewBox="0 0 200 140" role="img" aria-label={`${moodLabels[mood]} 기본 고양이 캐릭터`} className={styles.image}>
        <ellipse cx="100" cy="128" rx="67" ry="6" fill="#e5d7df" />
        <g stroke="#806575" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M53 79 Q36 39 59 27 L81 45 Q100 37 119 45 L141 27 Q164 40 147 79 Q151 110 131 119 H69 Q49 109 53 79Z" fill="#fff7eb" />
          <path d="M59 37 L65 52 L76 48Z M141 37 L135 52 L124 48Z" fill="#edb9cb" stroke="none" />
          {mood === 'paused' ? <path d="M72 76 Q79 82 86 76 M114 76 Q121 82 128 76" fill="none" /> : <><ellipse cx="80" cy="76" rx="3" ry="4" fill="#806575" /><ellipse cx="120" cy="76" rx="3" ry="4" fill="#806575" /></>}
          <path d="M97 85 L100 88 L103 85 M100 88 Q94 95 89 90 M100 88 Q106 95 111 90" fill="none" />
          <ellipse cx="66" cy="87" rx="7" ry="4" fill="#edb9cb" stroke="none" /><ellipse cx="134" cy="87" rx="7" ry="4" fill="#edb9cb" stroke="none" />
          {mood === 'running' ? <><path d="M56 108 L100 115 L144 108 L141 130 L100 134 L59 130Z" fill="#c1d9f4" /><path d="M100 115 V134 M68 118 L87 121 M112 121 L132 118" fill="none" /><path d="M130 107 L145 93" stroke="#b98ca1" strokeWidth="5" /><ellipse cx="65" cy="109" rx="10" ry="5" fill="#fff7eb" /></> : mood === 'paused' ? <><rect x="85" y="105" width="30" height="24" rx="6" fill="#c7f1d5" /><path d="M115 109 Q130 109 126 120 Q124 125 115 123 M95 97 Q89 92 95 87" fill="none" /></> : <><path d="M81 119 Q89 102 99 113 Q109 102 117 119" fill="#eaaac1" /><path d="M154 62 V74 M148 68 H160" stroke="#beaae7" /></>}
        </g>
        {mood === 'paused' && <text x="153" y="40" fill="#a386a7" fontSize="18">z z</text>}
      </svg>}
  </div>
}
