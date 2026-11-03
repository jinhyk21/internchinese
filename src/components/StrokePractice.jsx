import { useEffect, useRef, useState } from 'react'
import DrawBox from './DrawBox.jsx'
import { STROKES, judgeStroke } from '../strokes.js'

const GOAL = 5
const LS = 'ic_stroke_prog'
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }

// Luyện 12 nét cơ bản: xem mẫu chạy, viết theo mũi tên, máy chấm hình dạng + hướng nét. Ẩn nét mẫu để tự viết.
export default function StrokePractice() {
  const [i, setI] = useState(0)
  const [guide, setGuide] = useState(true)
  const [demo, setDemo] = useState(1)
  const [res, setRes] = useState(null)
  const [prog, setProg] = useState(load)
  const box = useRef(null)
  const s = STROKES[i]
  const path = s.pts.map(p => p.join(',')).join(' ')
  const end = s.pts[s.pts.length - 1], prev = s.pts[s.pts.length - 2]
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180 / Math.PI

  useEffect(() => { setRes(null); setDemo(1); box.current?.clear() }, [i])
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(prog)) } catch { /* bỏ qua */ } }, [prog])

  const onStroke = (pts) => {
    const r = judgeStroke(pts, s.pts)
    setRes(r)
    if (r.ok) setProg(p => ({ ...p, [s.zh]: Math.min(GOAL, (p[s.zh] || 0) + 1) }))
    setTimeout(() => box.current?.clear(), 900)
  }
  const done = STROKES.filter(x => (prog[x.zh] || 0) >= GOAL).length

  return (
    <div className="sp">
      <div className="card sp-list">
        <p className="resultinfo">Đạt {done}/{STROKES.length} nét (mỗi nét viết đúng {GOAL} lần)</p>
        <div className="sp-tiles">
          {STROKES.map((x, k) => {
            const n = prog[x.zh] || 0
            return (
              <button key={x.zh} className={'sp-t' + (k === i ? ' on' : '') + (n >= GOAL ? ' ok' : '')} onClick={() => setI(k)}>
                <b className="zh">{x.zh}</b><small>{x.vi}</small><i style={{ width: `${n / GOAL * 100}%` }} />
              </button>)
          })}
        </div>
      </div>

      <div className="card sp-main">
        <h3><span className="zh">{s.zh}</span> {s.py} · {s.vi}</h3>
        <p>{s.how}</p>
        <p className="sp-ex">Xuất hiện trong: <b className="zh">{s.ex}</b></p>
        <div className="sp-board">
          <DrawBox ref={box} onStroke={onStroke}>
            <svg className="sp-guide" viewBox="0 0 100 100">
              {guide && <>
                <polyline points={path} className="g" />
                <circle cx={s.pts[0][0]} cy={s.pts[0][1]} r="3.2" className="start" />
                <polygon points="0,-4 7,0 0,4" className="arrow" transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} />
              </>}
              <polyline key={demo} points={path} pathLength="1" className="demo" />
            </svg>
          </DrawBox>
        </div>
        <p className={'sp-res' + (res ? (res.ok ? ' ok' : ' bad') : '')}>{res ? (res.ok ? '✔ ' : '✘ ') + res.msg : 'Viết một nét theo mẫu rồi nhấc bút để được chấm.'}</p>
        <div className="row nb c">
          <button className="btn gold" onClick={() => setDemo(d => d + 1)}>▶ Xem mẫu</button>
          <button className="btn ghost" onClick={() => setGuide(g => !g)}>{guide ? 'Ẩn nét mẫu (tự viết)' : 'Hiện nét mẫu'}</button>
          <button className="btn ghost" onClick={() => box.current?.clear()}>✕ Xóa</button>
          <button className="btn" disabled={i >= STROKES.length - 1} onClick={() => setI(i + 1)}>Nét tiếp ›</button>
        </div>
      </div>
    </div>
  )
}
