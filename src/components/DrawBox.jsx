import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'

const S = 400

// Ô viết 米字格: ghi từng nét (chuột / ngón tay / bút). onStroke nhận nét vừa viết, toạ độ chuẩn hoá 0–100.
const DrawBox = forwardRef(function DrawBox({ onStroke, onChange, children, className = '' }, ref) {
  const cv = useRef(null)
  const strokes = useRef([])      // [[xs, ys, ts], ...]
  const cur = useRef(null)
  const [n, setN] = useState(0)

  const paint = useCallback(() => {
    const c = cv.current, g = c.getContext('2d')
    g.clearRect(0, 0, S, S)
    g.strokeStyle = '#231a14'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'
    for (const [xs, ys] of strokes.current) {
      g.beginPath(); xs.forEach((x, i) => (i ? g.lineTo(x, ys[i]) : g.moveTo(x, ys[i])))
      if (xs.length === 1) g.lineTo(xs[0] + .1, ys[0])
      g.stroke()
    }
  }, [])
  const sync = () => { setN(strokes.current.length); onChange?.(strokes.current.length) }
  const pos = (e) => { const r = cv.current.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * S / r.width), Math.round((e.clientY - r.top) * S / r.height)] }

  const down = (e) => {
    e.preventDefault(); cv.current.setPointerCapture(e.pointerId)
    const [x, y] = pos(e); cur.current = [[x], [y], [Math.round(performance.now())]]
    strokes.current.push(cur.current); sync()
  }
  const move = (e) => {
    if (!cur.current) return
    const [x, y] = pos(e); cur.current[0].push(x); cur.current[1].push(y); cur.current[2].push(Math.round(performance.now())); paint()
  }
  const up = () => {
    const s = cur.current
    if (!s) return
    cur.current = null; paint()
    onStroke?.(s[0].map((x, i) => [x / S * 100, s[1][i] / S * 100]))
  }

  useImperativeHandle(ref, () => ({
    clear() { strokes.current = []; cur.current = null; paint(); sync() },
    undo() { strokes.current.pop(); paint(); sync() },
    count: () => strokes.current.length,
    getInk: () => ({ strokes: strokes.current, w: S, h: S }),
  }))

  return (
    <div className={'drawbox ' + className}>
      <canvas ref={cv} width={S} height={S} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
      <i className="hw-grid" />
      {children}
      {!n && <span className="hw-hint zh"><small>Viết vào đây</small></span>}
    </div>
  )
})
export default DrawBox
