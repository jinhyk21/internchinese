import { useCallback, useEffect, useRef, useState } from 'react'
import { recognizeInk } from '../handwriting.js'
import { useToast } from '../toast.jsx'

// Bảng viết tay: vẽ bằng chuột/ngón tay/bút, tự nhận diện sau khi nhấc bút, chọn chữ gợi ý để chèn vào ô nhập.
export default function HandwritingPad({ onPick }) {
  const cv = useRef(null)
  const strokes = useRef([])        // [[xs, ys, ts], ...]
  const cur = useRef(null)
  const timer = useRef(null)
  const [cands, setCands] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const toast = useToast()
  const [empty, setEmpty] = useState(true)

  const paint = useCallback(() => {
    const c = cv.current, g = c.getContext('2d')
    g.clearRect(0, 0, c.width, c.height)
    g.strokeStyle = '#231a14'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'
    for (const [xs, ys] of strokes.current) {
      g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo(x, ys[i]) : g.moveTo(x, ys[i])))
      if (xs.length === 1) g.lineTo(xs[0] + .1, ys[0])
      g.stroke()
    }
  }, [])

  useEffect(() => { // canvas theo kích thước thật (nét rõ trên màn hình retina)
    const c = cv.current, rect = c.getBoundingClientRect(), d = window.devicePixelRatio || 1
    c.width = Math.round(rect.width * d); c.height = Math.round(rect.height * d)
    c.getContext('2d').scale(1, 1)
  }, [])

  const pos = (e) => {
    const c = cv.current, rect = c.getBoundingClientRect()
    return [Math.round((e.clientX - rect.left) * c.width / rect.width), Math.round((e.clientY - rect.top) * c.height / rect.height)]
  }
  const down = (e) => {
    e.preventDefault(); cv.current.setPointerCapture(e.pointerId); clearTimeout(timer.current)
    const [x, y] = pos(e); cur.current = [[x], [y], [Math.round(performance.now())]]
    strokes.current.push(cur.current); setEmpty(false)
  }
  const move = (e) => {
    if (!cur.current) return
    const [x, y] = pos(e); cur.current[0].push(x); cur.current[1].push(y); cur.current[2].push(Math.round(performance.now()))
    paint()
  }
  const up = () => {
    if (!cur.current) return
    cur.current = null; paint()
    clearTimeout(timer.current); timer.current = setTimeout(recognize, 700)   // nhấc bút 0.7s → nhận diện
  }

  async function recognize() {
    if (!strokes.current.length) return
    setBusy(true); setErr('')
    try { setCands(await recognizeInk(strokes.current, cv.current.width, cv.current.height)) }
    catch (e) { setErr(e.message); toast('Nhận diện chữ viết tay thất bại: ' + e.message, 'err') } finally { setBusy(false) }
  }
  const clear = () => { clearTimeout(timer.current); strokes.current = []; cur.current = null; setCands([]); setErr(''); setEmpty(true); paint() }
  const undo = () => {
    strokes.current.pop(); paint(); setEmpty(!strokes.current.length)
    if (strokes.current.length) { clearTimeout(timer.current); timer.current = setTimeout(recognize, 400) } else setCands([])
  }
  const pick = (ch) => { onPick(ch); clear() }

  return (
    <div className="hw">
      <div className="hw-board">
        <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
        <i className="hw-grid" />
        {empty && <span className="hw-hint zh">请在此书写<small>Viết chữ Hán vào đây</small></span>}
      </div>
      <div className="hw-side">
        <div className="hw-cands">
          {busy && <small>Đang nhận diện…</small>}
          {!busy && !cands.length && !err && <small>Gợi ý chữ sẽ hiện ở đây. Chạm vào một chữ để chèn.</small>}
          {cands.map(c => <button type="button" key={c} className="zh" onClick={() => pick(c)}>{c}</button>)}
          {err && <small className="msg">{err}</small>}
        </div>
        <div className="hw-tools">
          <button type="button" className="btn ghost sm" onClick={undo}>↶ Hoàn tác</button>
          <button type="button" className="btn ghost sm" onClick={clear}>✕ Xóa</button>
          <button type="button" className="btn sm" onClick={recognize}>识别 · Nhận diện</button>
        </div>
      </div>
    </div>
  )
}
