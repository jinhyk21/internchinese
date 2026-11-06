import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import DrawBox from './DrawBox.jsx'
import { cjk } from './WordPicker.jsx'
import { recognizeInk } from '../handwriting.js'
import { useToast } from '../toast.jsx'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }

// 3 mức: tô theo chữ mẫu đậm → mẫu mờ → viết theo trí nhớ (chỉ xem lén mẫu khi cần)
const LEVELS = [['guide', 'Hướng dẫn', 'Đường đỏ = đường bút liền nét (các nét kề nhau nối thành một lần hạ bút); chấm xanh có số = điểm hạ bút. Bấm ▶ xem chạy mẫu rồi viết theo'], ['trace', 'Tô theo', 'Mẫu đậm — tô lên chữ, viết liền tay'], ['fade', 'Mẫu mờ', 'Mẫu rất nhạt — nhìn mẫu và tự viết'], ['memo', 'Nhớ chữ', 'Ẩn mẫu — viết theo trí nhớ']]

// Luyện HÀNH THƯ (行书) theo từ vựng: viết liền nét, nhanh, ít nhấc bút — dễ nhớ chữ và viết tay nhanh hơn.
// Đường bút liền nét: nối các nét kề nhau (cuối nét này → đầu nét sau, đủ gần) thành MỘT lần hạ bút, làm mượt thành đường cong.
// Xấp xỉ từ dữ liệu nét khải thư của hanzi-writer, không phải chữ viết tay hành thư thật.
const LINK = 280
const smooth = (P) => {
  let d = `M${P[0][0]},${P[0][1]}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  return d
}
const useGuide = (chars) => {
  const [g, setG] = useState({})
  useEffect(() => {
    let off = false
    chars.forEach(ch => HanziWriter.loadCharacterData(ch).then(d => {
      if (off) return
      const st = d.strokes.map((_, i) => d.medians[i].map(([x, y]) => [x, 962 - y]))
      const runs = []
      st.forEach((m, i) => {
        const last = runs[runs.length - 1]
        const a = last && last.P[last.P.length - 1], b = m[0]
        if (last && Math.hypot(a[0] - b[0], a[1] - b[1]) < LINK) {
          const dx = b[0] - a[0], dy = b[1] - a[1]       // nét tơ: lướt cong từ cuối nét trước sang đầu nét sau
          last.P.push([(a[0] + b[0]) / 2 - dy * .18, (a[1] + b[1]) / 2 + dx * .18], ...m); last.n++
        } else runs.push({ P: [...m], n: 1, from: i + 1 })
      })
      setG(o => ({ ...o, [ch]: { st, strokes: st.length, runs: runs.map(r => ({ ...r, d: smooth(r.P), start: r.P[0] })) } }))
    }).catch(() => {}))
    return () => { off = true }
  }, [chars])
  return g
}

// Độ khớp hình: căn khung bao của nét viết vào khung bao của chữ chuẩn (400×400), rồi đo
// phủ = % điểm chữ chuẩn có nét viết nằm gần · thừa = % điểm nét viết nằm xa mọi nét chuẩn (nét lạc)
const shapeMatch = (ink, st) => {
  const T = st.flat().map(([x, y]) => [x * 400 / 1024, y * 400 / 1024])
  const I = ink.strokes.flatMap(s => s[0].map((x, i) => [x, s[1][i]]))
  const bb = (A) => { const xs = A.map(p => p[0]), ys = A.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
  const [a0, b0, a1, b1] = bb(T), [c0, d0, c1, d1] = bb(I)
  const J = I.map(([x, y]) => [a0 + (x - c0) / Math.max(1, c1 - c0) * (a1 - a0), b0 + (y - d0) / Math.max(1, d1 - d0) * (b1 - b0)])
  const near = (p, A, r) => A.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < r)
  const cover = T.filter(p => near(p, J, 55)).length / T.length
  const stray = J.filter(p => !near(p, T, 60)).length / J.length
  return { cover, stray }
}

export default function XingshuWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const refs = useRef([])
  const t0 = useRef([])                       // thời điểm bắt đầu viết của từng chữ
  const [lv, setLv] = useState('guide')
  const [peek, setPeek] = useState(-1)
  const [demo, setDemo] = useState(1)
  const guide = useGuide(chars)
  const [res, setRes] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const [info, setInfo] = useState({})        // { i: { ms, lifts } }

  useEffect(() => { setInfo({}); setRes({}); setPeek(-1); t0.current = []; refs.current.forEach(r => r?.clear()) }, [chars])

  const onStroke = (i) => () => {
    if (!t0.current[i]) t0.current[i] = performance.now()
    const ink = refs.current[i]?.getInk()
    setInfo(o => ({ ...o, [i]: { ms: Math.round(performance.now() - t0.current[i]), lifts: ink ? ink.strokes.length : 0 } }))
  }
  const clearOne = (i) => { refs.current[i]?.clear(); setRes(o => { const n = { ...o }; delete n[i]; return n }); t0.current[i] = 0; setInfo(o => { const n = { ...o }; delete n[i]; return n }) }
  const clearAll = () => chars.forEach((_, i) => clearOne(i))
  const check = async () => {
    setBusy(true)
    try {
      const out = {}
      for (let i = 0; i < chars.length; i++) {
        const ink = refs.current[i]?.getInk()
        if (!ink?.strokes.length) { out[i] = { empty: true }; continue }
        const g = guide[chars[i]]
        const xs = ink.strokes.flatMap(s => s[0]), ys = ink.strokes.flatMap(s => s[1])
        const big = (Math.max(...xs) - Math.min(...xs)) >= ink.w * .35 || (Math.max(...ys) - Math.min(...ys)) >= ink.h * .35
        const cands = (await recognizeInk(ink.strokes, ink.w, ink.h)).slice(0, 5)
        const rank = cands.indexOf(chars[i])
        const sm = g ? shapeMatch(ink, g.st) : null
        const lifts = ink.strokes.length, ms = info[i]?.ms || 0
        const tips = []
        if (!big) tips.push('Chữ viết quá nhỏ — viết to, chiếm gần hết ô.')
        if (rank < 0) tips.push('Máy không nhận ra đúng chữ này — kiểm tra lại cấu trúc, các nét chưa rõ hoặc nối quá đà làm mất nét.')
        else if (rank > 0) tips.push('Nhận ra nhưng chưa rõ ràng (máy đoán “' + cands[0] + '” trước) — nét nối vẫn phải giữ được hình chữ.')
        if (sm && sm.cover < .6) tips.push(`Chỉ phủ ${Math.round(sm.cover * 100)}% khung chữ — thiếu nét hoặc bố cục lệch, đối chiếu lại chữ mẫu.`)
        if (sm && sm.stray > .35) tips.push('Có nhiều nét thừa / lạc khỏi khung chữ.')
        if (g && lifts > g.strokes) tips.push(`Nhấc bút ${lifts} lần, nhiều hơn số nét (${g.strokes}) — chưa nối nét.`)
        else if (g && lifts > g.runs.length + 1) tips.push(`Nhấc bút ${lifts} lần — mẫu hành thư chỉ khoảng ${g.runs.length} lần, thử nối thêm các nét kề nhau.`)
        const ok = big && rank >= 0 && (!sm || (sm.cover >= .6 && sm.stray <= .35))
        const fluent = !g || lifts <= g.runs.length + 1
        const score = Math.round((big ? 15 : 0) + (rank === 0 ? 40 : rank > 0 ? 28 : 0) + (sm ? Math.min(1, sm.cover / .8) * 30 : 15) + (sm ? (1 - Math.min(1, sm.stray / .6)) * 5 : 3) + (fluent ? 10 : g && lifts <= g.strokes ? 5 : 0))
        out[i] = { ok, score, cands, rank, lifts, ms, sm, fluent, tips, runs: g?.runs.length, strokes: g?.strokes }
      }
      setRes(out)
    } catch (e) { toast('Chấm chữ viết tay thất bại: ' + e.message, 'err') } finally { setBusy(false) }
  }
  const done = chars.filter((_, i) => info[i]).length

  return (
    <div className="card vw">
      <div className="vw-head">
        <div><span className="zh vw-zh xs-font">{word.chinese}</span> <span className="pinyin">{word.pinyin}</span><br /><b>{word.vietnamese}</b></div>
        <button className="btn ghost sm" onClick={() => speak(word.chinese)}>🔊 Nghe</button>
      </div>

      <div className="seg2 xs-lv">
        {LEVELS.map(([k, name]) => <button key={k} className={lv === k ? 'on' : ''} onClick={() => setLv(k)}>{name}</button>)}
      </div>
      <p className="sp-res">{LEVELS.find(l => l[0] === lv)[2]}</p>
      {lv === 'guide' && <div className="row nb c"><button className="btn gold" onClick={() => setDemo(d => d + 1)}>▶ Chạy mẫu thứ tự nét</button></div>}

      <div className="vw-chars">
        {chars.map((ch, i) => (
          <div key={ch + i} className="vw-c xs-c">
            <div className="xs-box">
              <DrawBox ref={el => (refs.current[i] = el)} onStroke={onStroke(i)}>
                {lv === 'guide' && guide[ch] && (
                  <svg className="xs-guide" viewBox="0 0 1024 1024">
                    {guide[ch].runs.map((r, k) => <path key={'p' + k} d={r.d} className="rn" />)}
                    {guide[ch].runs.map((r, k) => <path key={demo + '-' + k} d={r.d} pathLength="1" className="dm" style={{ animationDelay: `${k * 1.1}s` }} />)}
                    {guide[ch].runs.map((r, k) => <g key={'s' + k}><circle cx={r.start[0]} cy={r.start[1]} r="34" className="st" /><text x={r.start[0]} y={r.start[1] + 14} className="no">{k + 1}</text></g>)}
                  </svg>
                )}
                {(lv !== 'memo' || peek === i) && <span className={'xs-tpl xs-font ' + (lv === 'fade' ? 'soft' : 'strong')}>{ch}</span>}
              </DrawBox>
            </div>
            {lv === 'guide' && guide[ch] && <small>{guide[ch].strokes} nét → <b>{guide[ch].runs.length} lần hạ bút</b> khi viết hành thư</small>}
            <small>{info[i] ? `${(info[i].ms / 1000).toFixed(1)} giây · ${info[i].lifts} lần nhấc bút` : 'Chưa viết'}</small>
            {res[i] && (res[i].empty ? <p className="xs-res bad">Chưa viết gì.</p> : (
              <div className={'xs-res ' + (res[i].ok ? 'ok' : 'bad')}>
                <b>{res[i].ok ? '✔ Đạt' : '✘ Chưa đạt'} · {res[i].score} điểm</b>
                <span>Máy đọc: {res[i].cands.slice(0, 3).join(' ') || '—'}{res[i].sm ? ` · khớp khung ${Math.round(res[i].sm.cover * 100)}%` : ''} · {res[i].lifts} lần nhấc bút{res[i].ms ? ` · ${(res[i].ms / 1000).toFixed(1)}s` : ''}</span>
                {res[i].ok && res[i].fluent && <span>Liền nét tốt — đúng tinh thần hành thư.</span>}
                {res[i].tips.map((t, k) => <span key={k}>• {t}</span>)}
              </div>))}
            <div className="fw-btns">
              {lv === 'memo' && <button className="btn ghost sm" onPointerDown={() => setPeek(i)} onPointerUp={() => setPeek(-1)} onPointerLeave={() => setPeek(-1)}>👁 Xem mẫu</button>}
              <button className="btn ghost sm" onClick={() => clearOne(i)}>✕ Viết lại</button>
            </div>
          </div>
        ))}
      </div>

      <div className="xs-tips">
        <b>Mẹo viết hành thư</b>
        <ul>
          <li>Viết <b>liền tay, nhanh</b> — không cần đều từng nét như khải thư (楷书).</li>
          <li>Nối các nét kề nhau bằng <b>nét tơ</b> (牵丝): cuối nét này lướt sang đầu nét sau.</li>
          <li>Nét <b>chấm</b> viết thành nét ngắn, nghiêng; <b>ngang</b> hơi chếch lên; <b>phẩy-mác</b> kéo dài, thoáng.</li>
          <li>Thứ tự nét vẫn giữ như khải thư: trái → phải, trên → dưới, ngoài → trong. Càng <b>ít nhấc bút</b> càng đúng tinh thần hành thư.</li>
        </ul>
      </div>

      {chars.length > 0 && chars.every((_, i) => res[i]?.ok) && <p className="sp-res ok">🎉 Cả từ đều đạt! Thử viết lại nhanh hơn và liền nét hơn.</p>}
      <p className="sp-res">{done === chars.length && chars.length ? '✔ Đã viết đủ — thử viết lại nhanh hơn và liền nét hơn nữa.' : `Đã viết ${done}/${chars.length} chữ.`}</p>
      <div className="row nb c">
        <button className="btn" disabled={busy || !done} onClick={check}>{busy ? 'Đang chấm…' : '✓ Chấm điểm'}</button>
        <button className="btn ghost" onClick={clearAll}>↺ Làm lại tất cả</button>
        {onNext && <button className="btn ghost" onClick={onNext}>Từ khác ›</button>}
      </div>
    </div>
  )
}
