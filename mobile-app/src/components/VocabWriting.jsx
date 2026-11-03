import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { cjk } from './WordPicker.jsx'

const SIZE = 170
const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }

// Luyện viết theo từ vựng CÓ HƯỚNG DẪN: xem thứ tự nét chạy mẫu, rồi viết theo — sai 2 lần sẽ gợi ý nét kế tiếp.
export default function VocabWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const boxes = useRef([])
  const writers = useRef([])
  const run = useRef(0)                 // đổi số này để huỷ phiên đang chạy
  const [mode, setMode] = useState('idle')   // idle | anim | quiz | done
  const [cur, setCur] = useState(-1)
  const [mist, setMist] = useState(0)
  const [counts, setCounts] = useState({})
  const [bad, setBad] = useState('')

  const stop = () => { run.current++; writers.current.forEach(w => { try { w.cancelQuiz() } catch { /* chưa quiz */ } }) }

  useEffect(() => {
    setMode('idle'); setCur(-1); setMist(0); setBad(''); setCounts({})
    boxes.current.slice(0, chars.length).forEach(el => { if (el) el.innerHTML = '' })
    writers.current = chars.map((ch, i) => HanziWriter.create(boxes.current[i], ch, {
      width: SIZE, height: SIZE, padding: 12, showOutline: true, showCharacter: true,
      strokeColor: '#231a14', outlineColor: '#e8d49a', highlightColor: '#c9a227', drawingColor: '#b3202a', drawingWidth: 9,
      strokeAnimationSpeed: 1.2, delayBetweenStrokes: 220, showHintAfterMisses: 2, highlightOnComplete: true,
      onLoadCharDataSuccess: (d) => setCounts(c => ({ ...c, [i]: d.strokes.length })),
      onLoadCharDataError: () => setBad(ch),
    }))
    return () => { stop(); boxes.current.forEach(el => { if (el) el.innerHTML = '' }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars])

  const reset = () => { stop(); setMode('idle'); setCur(-1); setMist(0); writers.current.forEach(w => { w.showCharacter(); w.showOutline() }) }

  const animate = async () => {
    stop(); const my = run.current; setMode('anim'); setMist(0)
    for (let i = 0; i < writers.current.length; i++) {
      if (my !== run.current) return
      setCur(i)
      writers.current[i].hideCharacter()
      await new Promise(res => writers.current[i].animateCharacter({ onComplete: res }))
    }
    if (my === run.current) { setMode('idle'); setCur(-1) }
  }

  const quiz = () => {
    stop(); const my = run.current; setMode('quiz'); setMist(0)
    writers.current.forEach(w => w.hideCharacter())
    const go = (i) => {
      if (my !== run.current) return
      if (i >= writers.current.length) { setMode('done'); setCur(-1); return }
      setCur(i)
      writers.current[i].quiz({ onMistake: () => setMist(m => m + 1), onComplete: () => go(i + 1) })
    }
    go(0)
  }

  return (
    <div className="card vw">
      <div className="vw-head">
        <div><span className="zh vw-zh">{word.chinese}</span> <span className="pinyin">{word.pinyin}</span><br /><b>{word.vietnamese}</b></div>
        <button className="btn ghost sm" onClick={() => speak(word.chinese)}>🔊 Nghe</button>
      </div>
      {bad && <p className="msg">Chưa có dữ liệu nét viết cho chữ “{bad}” (chữ hiếm). Hãy thử từ khác hoặc dùng tab “Tập viết”.</p>}
      <div className="vw-chars">
        {chars.map((ch, i) => (
          <div key={ch + i} className={'vw-c' + (cur === i ? ' cur' : '')}>
            <div className="vw-box" ref={el => (boxes.current[i] = el)} />
            <small>{ch} · {counts[i] ? `${counts[i]} nét` : '…'}</small>
          </div>
        ))}
      </div>
      <p className="sp-res">
        {mode === 'anim' && `Đang chạy mẫu chữ thứ ${cur + 1}/${chars.length} — quan sát thứ tự các nét.`}
        {mode === 'quiz' && `Viết chữ thứ ${cur + 1}/${chars.length}: vẽ từng nét theo đúng thứ tự · lỗi: ${mist}`}
        {mode === 'done' && (mist === 0 ? '🎉 Hoàn hảo! Không sai nét nào.' : `✔ Hoàn thành — bạn sai ${mist} lần. Luyện lại để viết chuẩn hơn.`)}
        {mode === 'idle' && 'Bấm “Xem nét viết” để xem mẫu, rồi “Viết theo” để tự viết có gợi ý.'}
      </p>
      <div className="row nb c">
        <button className="btn gold" onClick={animate}>▶ Xem nét viết</button>
        <button className="btn" onClick={quiz}>✍ Viết theo (có gợi ý)</button>
        <button className="btn ghost" onClick={reset}>↺ Làm lại</button>
        {onNext && <button className="btn ghost" onClick={onNext}>Từ khác ›</button>}
      </div>
    </div>
  )
}
