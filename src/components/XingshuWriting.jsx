import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import DrawBox from './DrawBox.jsx'
import { cjk } from './WordPicker.jsx'

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
      setG(o => ({ ...o, [ch]: { strokes: st.length, runs: runs.map(r => ({ ...r, d: smooth(r.P), start: r.P[0] })) } }))
    }).catch(() => {}))
    return () => { off = true }
  }, [chars])
  return g
}

export default function XingshuWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const refs = useRef([])
  const t0 = useRef([])                       // thời điểm bắt đầu viết của từng chữ
  const [lv, setLv] = useState('guide')
  const [peek, setPeek] = useState(-1)
  const [demo, setDemo] = useState(1)
  const guide = useGuide(chars)
  const [info, setInfo] = useState({})        // { i: { ms, lifts } }

  useEffect(() => { setInfo({}); setPeek(-1); t0.current = []; refs.current.forEach(r => r?.clear()) }, [chars])

  const onStroke = (i) => () => {
    if (!t0.current[i]) t0.current[i] = performance.now()
    const ink = refs.current[i]?.getInk()
    setInfo(o => ({ ...o, [i]: { ms: Math.round(performance.now() - t0.current[i]), lifts: ink ? ink.strokes.length : 0 } }))
  }
  const clearOne = (i) => { refs.current[i]?.clear(); t0.current[i] = 0; setInfo(o => { const n = { ...o }; delete n[i]; return n }) }
  const clearAll = () => chars.forEach((_, i) => clearOne(i))
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

      <p className="sp-res">{done === chars.length && chars.length ? '✔ Đã viết đủ — thử viết lại nhanh hơn và liền nét hơn nữa.' : `Đã viết ${done}/${chars.length} chữ.`}</p>
      <div className="row nb c">
        <button className="btn ghost" onClick={clearAll}>↺ Làm lại tất cả</button>
        {onNext && <button className="btn ghost" onClick={onNext}>Từ khác ›</button>}
      </div>
    </div>
  )
}
