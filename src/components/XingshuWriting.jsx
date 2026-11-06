import { useEffect, useMemo, useRef, useState } from 'react'
import DrawBox from './DrawBox.jsx'
import { cjk } from './WordPicker.jsx'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }

// 3 mức: tô theo chữ mẫu đậm → mẫu mờ → viết theo trí nhớ (chỉ xem lén mẫu khi cần)
const LEVELS = [['trace', 'Tô theo', 'Mẫu đậm — tô lên chữ, viết liền tay'], ['fade', 'Mẫu mờ', 'Mẫu rất nhạt — nhìn mẫu và tự viết'], ['memo', 'Nhớ chữ', 'Ẩn mẫu — viết theo trí nhớ']]

// Luyện HÀNH THƯ (行书) theo từ vựng: viết liền nét, nhanh, ít nhấc bút — dễ nhớ chữ và viết tay nhanh hơn.
export default function XingshuWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const refs = useRef([])
  const t0 = useRef([])                       // thời điểm bắt đầu viết của từng chữ
  const [lv, setLv] = useState('trace')
  const [peek, setPeek] = useState(-1)
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

      <div className="vw-chars">
        {chars.map((ch, i) => (
          <div key={ch + i} className="vw-c xs-c">
            <div className="xs-box">
              <DrawBox ref={el => (refs.current[i] = el)} onStroke={onStroke(i)}>
                {(lv !== 'memo' || peek === i) && <span className={'xs-tpl xs-font ' + (lv === 'trace' ? 'strong' : lv === 'fade' ? 'soft' : 'strong')}>{ch}</span>}
              </DrawBox>
            </div>
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
