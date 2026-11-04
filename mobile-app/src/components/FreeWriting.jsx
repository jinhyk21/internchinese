import { useEffect, useMemo, useRef, useState } from 'react'
import DrawBox from './DrawBox.jsx'
import { cjk } from './WordPicker.jsx'
import { recognizeInk } from '../handwriting.js'
import { useToast } from '../toast.jsx'

// Tập viết tổng thể KHÔNG hướng dẫn: chỉ có chữ mẫu, người học tự viết vào ô trống; máy nhận diện chữ để kiểm tra.
export default function FreeWriting({ word, onNext }) {
  const chars = useMemo(() => cjk(word.chinese), [word])
  const refs = useRef([])
  const [hide, setHide] = useState(false)
  const [res, setRes] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const toast = useToast()

  useEffect(() => { setRes({}); setErr(''); refs.current.forEach(r => r?.clear()) }, [chars])

  const check = async () => {
    setBusy(true); setErr('')
    try {
      const out = {}
      for (let i = 0; i < chars.length; i++) {
        const ink = refs.current[i]?.getInk()
        if (!ink?.strokes.length) { out[i] = { empty: true }; continue }
        const c = await recognizeInk(ink.strokes, ink.w, ink.h)
        out[i] = { ok: c.slice(0, 5).includes(chars[i]), first: c[0], cands: c.slice(0, 5) }
      }
      setRes(out)
    } catch (e) { setErr(e.message); toast('Chấm chữ viết tay thất bại: ' + e.message, 'err') } finally { setBusy(false) }
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
            {res[i] && !res[i].empty && <small>{res[i].ok ? '✔ Đúng chữ' : `✘ Máy nhận ra: ${res[i].cands.join(' ') || '—'}`}</small>}
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
