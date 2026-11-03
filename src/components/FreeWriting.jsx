import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import DrawBox from './DrawBox.jsx'
import { cjk } from './WordPicker.jsx'
import { recognizeInk } from '../handwriting.js'

// Số nét chuẩn của một chữ (hanzi-writer); null nếu chưa có dữ liệu
const strokeCache = {}
const stdStrokes = async (ch) => {
  if (ch in strokeCache) return strokeCache[ch]
  try { strokeCache[ch] = (await HanziWriter.loadCharacterData(ch)).strokes.length } catch { strokeCache[ch] = null }
  return strokeCache[ch]
}
// Chữ viết phải chiếm đủ ô (tránh chấm nhỏ / nét vụn): bao quanh ≥ 35% chiều rộng hoặc cao
const fillsBox = ({ strokes, w, h }) => {
  const xs = strokes.flatMap(s => s[0]), ys = strokes.flatMap(s => s[1])
  return (Math.max(...xs) - Math.min(...xs)) >= w * .35 || (Math.max(...ys) - Math.min(...ys)) >= h * .35
}

// Tập viết tổng thể KHÔNG hướng dẫn: chỉ có chữ mẫu, người học tự viết vào ô trống; máy nhận diện chữ để kiểm tra.
export default function FreeWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const refs = useRef([])
  const [hide, setHide] = useState(false)
  const [res, setRes] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setRes({}); setErr(''); refs.current.forEach(r => r?.clear()) }, [chars])

  const check = async () => {
    setBusy(true); setErr('')
    try {
      const out = {}
      for (let i = 0; i < chars.length; i++) {
        const ink = refs.current[i]?.getInk()
        if (!ink?.strokes.length) { out[i] = { empty: true }; continue }
        const c = (await recognizeInk(ink.strokes, ink.w, ink.h)).slice(0, 3)
        const exp = await stdStrokes(chars[i]), got = ink.strokes.length
        const rank = c.indexOf(chars[i])
        // đúng khi: máy nhận ra chữ này trong top 3 + đủ số nét chuẩn + viết đủ lớn
        let why = ''
        if (!fillsBox(ink)) why = 'Chữ viết quá nhỏ — hãy viết to, chiếm gần hết ô.'
        else if (exp && got !== exp) why = `Số nét chưa đúng: bạn viết ${got} nét, chữ chuẩn có ${exp} nét.`
        else if (rank < 0) why = 'Máy không nhận ra đúng chữ này — viết lại rõ nét, đúng thứ tự.'
        out[i] = { ok: !why, exact: rank === 0, why, cands: c, got, exp }
      }
      setRes(out)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const clearAll = () => { refs.current.forEach(r => r?.clear()); setRes({}) }
  const okAll = chars.length > 0 && chars.every((_, i) => res[i]?.ok)

  return (
    <div className="card vw">
      <div className="vw-head">
        <div><span className="pinyin">{word.pinyin}</span><br /><b>{word.vietnamese}</b></div>
        <label className="fw-hide"><input type="checkbox" checked={hide} onChange={e => setHide(e.target.checked)} /> Che chữ mẫu (viết theo trí nhớ)</label>
      </div>
      <h5>范字 · Chữ mẫu</h5>
      <div className="vw-chars">
        {chars.map((ch, i) => <div key={ch + i} className="vw-c"><div className={'fw-model zh' + (hide ? ' off' : '')}>{hide ? '？' : ch}</div></div>)}
      </div>
      <h5>书写 · Viết vào ô trống</h5>
      <div className="vw-chars">
        {chars.map((ch, i) => (
          <div key={ch + i} className={'vw-c' + (res[i] ? (res[i].ok ? ' good' : res[i].empty ? '' : ' wrong') : '')}>
            <DrawBox ref={el => (refs.current[i] = el)} className="fw-box" onChange={() => setRes(r => (r[i] ? { ...r, [i]: undefined } : r))} />
            <div className="fw-btns">
              <button className="btn ghost sm" onClick={() => refs.current[i]?.undo()}>↶</button>
              <button className="btn ghost sm" onClick={() => refs.current[i]?.clear()}>✕</button>
            </div>
            {res[i] && !res[i].empty && (res[i].ok
              ? <small>{res[i].exact ? '✔ Đúng chữ, đủ nét' : '✔ Đạt (chữ hơi khó đọc — viết rõ hơn)'}{res[i].exp ? ` · ${res[i].got}/${res[i].exp} nét` : ''}</small>
              : <small>✘ {res[i].why}{res[i].cands.length ? ` (máy đọc: ${res[i].cands.join(' ')})` : ''}</small>)}
            {res[i]?.empty && <small>Chưa viết</small>}
          </div>
        ))}
      </div>
      {err && <p className="msg">{err}</p>}
      <p className="sp-res">{okAll ? '🎉 Bạn đã viết đúng cả từ!' : 'Viết xong bấm “Kiểm tra”. Máy nhận diện chữ viết tay (cần mạng).'}</p>
      <div className="row nb c">
        <button className="btn gold" disabled={busy} onClick={check}>{busy ? 'Đang kiểm tra…' : '检查 · Kiểm tra'}</button>
        <button className="btn ghost" onClick={clearAll}>Xóa hết</button>
        {onNext && <button className="btn ghost" onClick={onNext}>Từ khác ›</button>}
      </div>
    </div>
  )
}
