import { useState } from 'react'
import VoiceRecorder from './VoiceRecorder.jsx'
import { PRON_PASS, pronLabel, savePron, scorePronunciation } from '../pronounce.js'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u) }

// Kiểm tra phát âm một từ: nghe mẫu → bấm đọc → hiện điểm + từng âm tiết đúng/sai.
// word: { id?, chinese, pinyin, vietnamese } · onScore(score, heard): gọi sau mỗi lần đọc.
export default function PronounceBox({ word, onScore, initial = null }) {
  const [rec, setRec] = useState(false)
  const [res, setRes] = useState(initial)

  const done = (heard) => {
    setRec(false)
    const r = scorePronunciation(word.chinese, heard)
    setRes(r)
    if (word.id) savePron(word.id, r.score)
    onScore?.(r.score, heard)
  }
  const tone = res ? (res.score >= 90 ? 'good' : res.score >= PRON_PASS ? 'mid' : '') : ''

  return (
    <div className="pron">
      <div className="pron-word">
        <div className="hanzi">{word.chinese}</div>
        <div className="pinyin">{word.pinyin}</div>
        {word.vietnamese && <div className="vi">{word.vietnamese}</div>}
      </div>
      <div className="row nb c">
        <button className="btn ghost" onClick={() => speak(word.chinese)}>🔊 Nghe mẫu</button>
        <button className="btn gold" onClick={() => setRec(true)}>🎤 {res ? 'Đọc lại' : 'Bấm để đọc'}</button>
      </div>
      {res && (
        <div className="pron-res">
          <div className={'ring ' + tone} style={{ '--p': res.score }}><b>{res.score}</b></div>
          <b className={res.score >= PRON_PASS ? 'pron-ok' : 'pron-bad'}>{pronLabel(res.score)}</b>
          {res.heard
            ? <small>Máy nghe được: <span className="zh">{res.heard}</span></small>
            : <small>Không nghe rõ — hãy nói to, rõ và thử lại.</small>}
          <div className="pron-parts">
            {res.parts.map((p, i) => (
              <span key={i} className={'pron-p ' + (p.s >= 1 ? 'ok' : p.s > 0 ? 'tone' : 'bad')}>
                <b className="zh">{p.ch}</b><small>{p.py}</small>
                <em>{p.s >= 1 ? '✔ đúng' : p.s > 0 ? 'sai thanh điệu' : '✘ sai âm'}</em>
              </span>
            ))}
          </div>
        </div>
      )}
      {rec && <VoiceRecorder strict title={`Hãy đọc: ${word.chinese}`} onClose={() => setRec(false)} onSend={done} />}
    </div>
  )
}
