import { useEffect, useMemo, useRef, useState } from 'react'
import { norm } from '../text.js'

// Dropdown có ô tìm kiếm ngay trong danh sách: mở ra là gõ lọc luôn, không cần tìm ở ngoài.
// options: [{ value, label, sub? }]; allLabel: nhãn của lựa chọn "không lọc" (value '').
export default function Combo({ value, onChange, options, allLabel, allValue = '', placeholder = 'Tìm…', className = '' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef(null), inp = useRef(null)

  useEffect(() => {
    if (!open) return
    const off = e => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc)
    inp.current?.focus()
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc) }
  }, [open])

  const all = useMemo(() => allLabel ? [{ value: allValue, label: allLabel }, ...options] : options, [options, allLabel, allValue])
  const cur = all.find(o => String(o.value) === String(value))
  const nq = norm(q)
  const list = nq ? all.filter(o => norm(o.label + ' ' + (o.sub || '')).includes(nq)) : all
  const pick = v => { onChange(v); setOpen(false); setQ('') }

  return (
    <div className={'cb ' + className} ref={box}>
      <button type="button" className={'cb-btn' + (cur && String(cur.value) !== String(allValue) ? ' set' : '')} onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{cur ? cur.label : allLabel || placeholder}</span><i>▾</i>
      </button>
      {open && (
        <div className="cb-pop" role="listbox">
          {all.length > 6 && <input ref={inp} className="cb-q" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && list[0]) { e.preventDefault(); pick(list[0].value) } }} />}
          <ul>
            {list.map(o => <li key={o.value} role="option" aria-selected={String(o.value) === String(value)} className={String(o.value) === String(value) ? 'on' : ''} onClick={() => pick(o.value)}>{o.label}</li>)}
            {!list.length && <li className="none">Không có kết quả</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
