import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { HSK_LEVELS } from '../hsk.js'
import { norm, hasZh } from '../text.js'
import { Pager } from './ui.jsx'

const PER = 18
const COLS = 'id,chinese,pinyin,vietnamese,difficulty'
const clean = (s) => s.replace(/[,()%*\\]/g, ' ').trim()
export const cjk = (s) => [...s].filter(c => /[一-鿿]/.test(c)).slice(0, 6)

// Chọn từ để luyện viết: theo cấp HSK / ngành, tìm kiếm (có cả tiếng Việt không dấu), phân trang 18 từ/trang ở server.
export default function WordPicker({ word, onPick }) {
  const [level, setLevel] = useState('HSK 1')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState(null)
  const [count, setCount] = useState(0)
  const noCol = useRef(false)
  const first = useRef(true)

  useEffect(() => { const t = setTimeout(() => { setQd(clean(q)); setPage(1) }, 300); return () => clearTimeout(t) }, [q])
  useEffect(() => {
    let on = true
    setRows(null)
    ;(async () => {
      const build = (useCol) => {
        let qy = supabase.from('vocabulary').select(COLS, { count: 'exact' })
        if (!qd) qy = level === 'industry' ? qy.not('category_id', 'is', null) : qy.eq('difficulty', level).is('category_id', null)
        else if (useCol && !hasZh(qd)) qy = qy.ilike('search_text', `%${norm(qd)}%`)
        else qy = qy.or(`chinese.ilike.%${qd}%,pinyin.ilike.%${qd}%,vietnamese.ilike.%${qd}%`)
        return qy.order('created_at').order('id').range((page - 1) * PER, page * PER - 1)
      }
      let r = await build(!noCol.current)
      if (r.error && /search_text/.test(r.error.message)) { noCol.current = true; r = await build(false) }
      if (!on) return
      const data = (r.data || []).filter(w => cjk(w.chinese).length)
      setRows(data); setCount(r.count || 0)
      if (first.current && data[0]) { first.current = false; onPick(data[0]) }
    })()
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, qd, page])

  const pages = Math.max(1, Math.ceil(count / PER))
  const random = () => { if (rows?.length) onPick(rows[Math.floor(Math.random() * rows.length)]) }

  return (
    <div className="card wp">
      <div className="chips">
        {HSK_LEVELS.map(l => <button key={l} className={level === l ? 'chip sm on' : 'chip sm'} onClick={() => { setLevel(l); setPage(1) }}>{l}</button>)}
        <button className={level === 'industry' ? 'chip sm on' : 'chip sm'} onClick={() => { setLevel('industry'); setPage(1) }}>行业</button>
      </div>
      <input className="search" placeholder="Tìm chữ, pinyin hoặc nghĩa…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="wp-head"><small>{rows ? `${count.toLocaleString('vi-VN')} từ · trang ${page}/${pages}` : 'Đang tải…'}</small>
        <button className="btn ghost sm" onClick={random}>随机 · Ngẫu nhiên</button></div>
      <div className="wp-list">
        {!rows ? [...Array(8)].map((_, i) => <div key={i} className="sk" style={{ height: 54 }} />)
          : !rows.length ? <small>Không có từ phù hợp.</small>
          : rows.map(w => (
            <button key={w.id} className={'wp-w' + (word?.id === w.id ? ' on' : '')} onClick={() => onPick(w)}>
              <b className="zh">{w.chinese}</b><span>{w.pinyin}</span><small>{w.vietnamese}</small>
            </button>))}
      </div>
      <Pager page={page} pages={pages} onChange={setPage} />
    </div>
  )
}
