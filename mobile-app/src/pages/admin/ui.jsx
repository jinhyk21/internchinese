import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// ---------- toast
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastHost({ children }) {
  const [list, setList] = useState([])
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random()
    setList(l => [...l, { id, text, kind }])
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="a-toasts">{list.map(t => <div key={t.id} className={'a-toast ' + t.kind}>{t.text}</div>)}</div>
    </ToastCtx.Provider>
  )
}

// ---------- khung
export function Head({ title, sub, children }) {
  return (
    <div className="a-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="a-actions">{children}</div>}
    </div>
  )
}
export const Panel = ({ title, hint, children, className = '', right }) => (
  <section className={'a-panel ' + className}>
    {(title || right) && <header><h3>{title}</h3>{hint && <small>{hint}</small>}{right}</header>}
    {children}
  </section>
)
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="a-modal" onMouseDown={onClose}>
      <div className={'a-dialog' + (wide ? ' wide' : '')} onMouseDown={e => e.stopPropagation()}>
        <header><h3>{title}</h3><button className="a-x" onClick={onClose} aria-label="Đóng">✕</button></header>
        <div className="a-dbody">{children}</div>
      </div>
    </div>
  )
}
export const Pager = ({ page, size, count, onChange }) => count > size ? (
  <div className="a-pager">
    <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
    <span>{page} / {Math.ceil(count / size)} · {count.toLocaleString('vi-VN')} bản ghi</span>
    <button disabled={page * size >= count} onClick={() => onChange(page + 1)}>›</button>
  </div>
) : null
export const Tag = ({ kind = '', children }) => <span className={'a-tag ' + kind}>{children}</span>
export const Loading = () => <div className="a-loading"><i /><i /><i /></div>
export const Empty = ({ text = 'Không có dữ liệu' }) => <div className="a-empty">{text}</div>

// ---------- KPI
export function Kpi({ label, value, sub, delta, spark, tone = 'cyan' }) {
  return (
    <div className={'a-kpi ' + tone}>
      <span className="l">{label}</span>
      <b>{value}</b>
      <div className="s">
        {delta != null && <em className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</em>}
        {sub && <small>{sub}</small>}
      </div>
      {spark && <Spark data={spark} />}
    </div>
  )
}
export function Spark({ data }) {
  const w = 120, h = 34, max = Math.max(1, ...data)
  const pts = data.map((v, i) => [i / Math.max(1, data.length - 1) * w, h - 3 - v / max * (h - 6)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><path d={`${d} L${w} ${h} L0 ${h}Z`} className="fill" /><path d={d} /></svg>
}

// ---------- biểu đồ SVG
const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)']
export function AreaChart({ labels, series, height = 220 }) {
  const W = 720, H = height, P = { l: 34, r: 10, t: 12, b: 24 }
  const max = Math.max(1, ...series.flatMap(s => s.data))
  const nice = Math.ceil(max / 4) * 4 || 4
  const x = (i) => P.l + i / Math.max(1, labels.length - 1) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - v / nice) * (H - P.t - P.b)
  const step = Math.ceil(labels.length / 8)
  const [hover, setHover] = useState(null)
  return (
    <div className="a-chart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)}
        onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; setHover(Math.max(0, Math.min(labels.length - 1, Math.round((px - P.l) / (W - P.l - P.r) * (labels.length - 1))))) }}>
        <defs>{series.map((s, k) => <linearGradient key={k} id={`ag${k}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={COLORS[k]} stopOpacity=".45" /><stop offset="1" stopColor={COLORS[k]} stopOpacity="0" /></linearGradient>)}</defs>
        {[0, 1, 2, 3, 4].map(i => <g key={i}><line className="grid" x1={P.l} x2={W - P.r} y1={y(nice / 4 * i)} y2={y(nice / 4 * i)} /><text className="ax" x={P.l - 6} y={y(nice / 4 * i) + 3} textAnchor="end">{Math.round(nice / 4 * i)}</text></g>)}
        {labels.map((l, i) => i % step === 0 && <text key={i} className="ax" x={x(i)} y={H - 6} textAnchor="middle">{l}</text>)}
        {series.map((s, k) => {
          const d = s.data.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')
          return <g key={k}><path d={`${d} L${x(s.data.length - 1)} ${y(0)} L${x(0)} ${y(0)}Z`} fill={`url(#ag${k})`} /><path d={d} className="line" style={{ stroke: COLORS[k] }} /></g>
        })}
        {hover != null && <g><line className="cursor" x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} />{series.map((s, k) => <circle key={k} cx={x(hover)} cy={y(s.data[hover])} r="4" style={{ fill: COLORS[k] }} />)}</g>}
      </svg>
      {hover != null && <div className="a-tip" style={{ left: `${x(hover) / W * 100}%` }}><b>{labels[hover]}</b>{series.map((s, k) => <span key={k}><i style={{ background: COLORS[k] }} />{s.name}: {s.data[hover]}</span>)}</div>}
      <div className="a-legend">{series.map((s, k) => <span key={k}><i style={{ background: COLORS[k] }} />{s.name}</span>)}</div>
    </div>
  )
}
export function Columns({ items, height = 170, unit = '' }) {
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <div className="a-cols" style={{ height }}>
      {items.map((it, k) => (
        <div key={k} title={`${it.label}: ${it.value}${unit}`}>
          <b>{it.value}</b><i style={{ height: `${it.value / max * 100}%`, background: it.color }} /><span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}
export function HBars({ items, unit = '', empty = 'Chưa có dữ liệu' }) {
  const max = Math.max(1, ...items.map(i => i.value))
  if (!items.length) return <Empty text={empty} />
  return (
    <div className="a-hbars">
      {items.map((it, k) => (
        <div key={k}><span title={it.label}>{it.label}</span><div><i style={{ width: `${it.value / max * 100}%` }} /></div><b>{it.value}{unit}</b></div>
      ))}
    </div>
  )
}
export function Donut({ items, center }) {
  const total = items.reduce((t, i) => t + i.value, 0)
  let acc = 0
  const R = 52, C = 2 * Math.PI * R
  return (
    <div className="a-donut">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} className="bg" />
        {total > 0 && items.map((it, k) => {
          const len = it.value / total * C, off = -acc / total * C; acc += it.value
          return <circle key={k} cx="70" cy="70" r={R} className="seg" style={{ stroke: COLORS[k % 5], strokeDasharray: `${len} ${C - len}`, strokeDashoffset: off }} />
        })}
        <text x="70" y="68" textAnchor="middle" className="n">{center ?? total}</text>
        <text x="70" y="86" textAnchor="middle" className="t">tổng</text>
      </svg>
      <ul>{items.map((it, k) => <li key={k}><i style={{ background: COLORS[k % 5] }} />{it.label}<b>{it.value}{total ? ` · ${Math.round(it.value / total * 100)}%` : ''}</b></li>)}</ul>
    </div>
  )
}
export function Radar({ axes }) {
  const n = axes.length, c = 110, r = 80
  const pt = (i, v) => { const a = -Math.PI / 2 + i / n * 2 * Math.PI; return [c + Math.cos(a) * r * v / 100, c + Math.sin(a) * r * v / 100] }
  const poly = (v) => axes.map((a, i) => pt(i, v ?? a.value).join(',')).join(' ')
  return (
    <svg className="a-radar" viewBox="0 0 220 220">
      {[25, 50, 75, 100].map(g => <polygon key={g} points={poly(g)} className="rg" />)}
      {axes.map((a, i) => <line key={i} x1={c} y1={c} x2={pt(i, 100)[0]} y2={pt(i, 100)[1]} className="rg" />)}
      <polygon points={poly()} className="rv" />
      {axes.map((a, i) => { const [x, y] = pt(i, 118); return <text key={i} x={x} y={y + 3} textAnchor="middle" className="rl">{a.label} {Math.round(a.value)}</text> })}
    </svg>
  )
}
export function Heat({ grid, rows, cols }) {
  const max = Math.max(1, ...grid.flat())
  return (
    <div className="a-heat" style={{ gridTemplateColumns: `34px repeat(${cols.length}, 1fr)` }}>
      <span />{cols.map((c, i) => <small key={i}>{c}</small>)}
      {grid.map((row, r) => [<small key={'r' + r}>{rows[r]}</small>, ...row.map((v, k) => <i key={r + '-' + k} title={`${rows[r]} ${cols[k]}h: ${v}`} style={{ '--v': v / max }} />)])}
    </div>
  )
}
