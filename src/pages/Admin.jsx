import { useEffect, useState } from 'react'
import { norm } from '../text.js'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { PageHeader, Empty } from '../components/ui.jsx'

const TABLES = {
  categories: { label: '行业 Ngành', title: 'name', fields: [['name', 'Tên'], ['name_zh', 'Tên (中文)'], ['description', 'Mô tả'], ['icon', 'Icon'], ['display_order', 'Thứ tự', 'number'], ['is_active', 'Hiển thị', 'bool']] },
  scenarios: { label: '情景 Tình huống', title: 'title', fields: [['title', 'Tiêu đề'], ['title_zh', 'Tiêu đề (中文)'], ['description', 'Mô tả'], ['situation', 'Bối cảnh', 'area'], ['difficulty', 'Độ khó', ['beginner', 'intermediate', 'advanced']], ['estimated_minutes', 'Số phút', 'number'], ['ai_role', 'Vai AI'], ['ai_role_zh', 'Vai AI (中文)'], ['ai_personality', 'Tính cách AI', 'area'], ['initial_message', 'Câu mở đầu'], ['learning_objectives', 'Mục tiêu (mỗi dòng 1 mục)', 'lines'], ['suggested_phrases', 'Câu gợi ý (JSON)', 'json'], ['category_id', 'Ngành', 'cat'], ['is_published', 'Xuất bản', 'bool']] },
  vocabulary: { label: '词汇 Từ vựng', title: 'chinese', fields: [['chinese', '中文'], ['pinyin', 'Pinyin'], ['vietnamese', 'Tiếng Việt'], ['example_chinese', 'Ví dụ'], ['example_pinyin', 'Ví dụ pinyin'], ['example_vietnamese', 'Ví dụ tiếng Việt'], ['difficulty', 'Độ khó', ['beginner', 'intermediate', 'advanced']], ['category_id', 'Ngành', 'cat']] },
}

// Supabase giới hạn 1000 dòng/lần → lấy tuần tự theo trang
async function pageAll(table, cols) {
  let out = [], from = 0
  for (;;) {
    const { data } = await supabase.from(table).select(cols).range(from, from + 999)
    out = out.concat(data || [])
    if (!data || data.length < 1000) return { data: out }
    from += 1000
  }
}

function Stats() {
  const [d, setD] = useState(null)
  useEffect(() => {
    (async () => {
      const [u, s, e, sc] = await Promise.all([
        pageAll('profiles', 'id,created_at,role'),
        pageAll('conversation_sessions', 'created_at,status,scenario_id,duration_seconds,communication_mode'),
        pageAll('conversation_evaluations', 'overall_score,created_at'),
        supabase.from('scenarios').select('id,title_zh,title'),
      ])
      setD({ users: u.data || [], ses: s.data || [], ev: e.data || [], sc: sc.data || [] })
    })()
  }, [])
  if (!d) return <p>加载中…</p>
  const months = [...Array(6)].map((_, i) => {
    const m = new Date(); m.setDate(1); m.setMonth(m.getMonth() - (5 - i)); return m
  })
  const key = (x) => { const t = new Date(x); return t.getFullYear() * 12 + t.getMonth() }
  const per = months.map(m => ({
    label: `${m.getMonth() + 1}/${m.getFullYear() % 100}`,
    n: d.ses.filter(x => key(x.created_at) === m.getFullYear() * 12 + m.getMonth()).length,
    avg: (() => { const l = d.ev.filter(x => key(x.created_at) === m.getFullYear() * 12 + m.getMonth()); return l.length ? Math.round(l.reduce((t, x) => t + Number(x.overall_score), 0) / l.length) : null })(),
  }))
  const max = Math.max(1, ...per.map(x => x.n))
  const done = d.ses.filter(x => x.status === 'completed').length
  const avg = d.ev.length ? Math.round(d.ev.reduce((t, x) => t + Number(x.overall_score), 0) / d.ev.length) : '—'
  const hours = Math.round(d.ses.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 3600)
  const top = Object.entries(d.ses.reduce((m, x) => (m[x.scenario_id] = (m[x.scenario_id] || 0) + 1, m), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => [d.sc.find(x => x.id === id), n])
  return (
    <>
      <div className="stats">
        <div><b>{d.users.length}</b><span>Học viên</span></div>
        <div><b>{d.ses.length}</b><span>Buổi luyện tập</span></div>
        <div><b>{Math.round(done / Math.max(1, d.ses.length) * 100)}%</b><span>Tỉ lệ hoàn thành</span></div>
        <div><b>{avg}</b><span>Điểm trung bình</span></div>
        <div><b>{hours}h</b><span>Tổng giờ luyện</span></div>
        <div><b>{Math.round(d.ses.filter(x => x.communication_mode === 'voice').length / Math.max(1, d.ses.length) * 100)}%</b><span>Dùng giọng nói</span></div>
      </div>
      <div className="card"><h4>Buổi luyện tập 6 tháng gần nhất</h4>
        <div className="mbars">{per.map(x => (
          <div key={x.label}><i style={{ height: `${x.n / max * 100}%` }}><b>{x.n}</b></i><span>{x.label}</span><small>{x.avg ?? '—'}đ</small></div>
        ))}</div></div>
      <div className="card" style={{ marginTop: '1rem' }}><h4>Tình huống được luyện nhiều nhất</h4>
        {top.map(([s, n]) => <p key={s?.id}><b className="zh">{s?.title_zh}</b> · {s?.title} — {n} lượt</p>)}</div>
    </>
  )
}

export default function Admin() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('stats')
  const [rows, setRows] = useState([])
  const [cats, setCats] = useState([])
  const [edit, setEdit] = useState(null)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [q, setQ] = useState('')
  const SIZE = 30
  const T = TABLES[tab] || TABLES.scenarios

  const load = async () => {
    if (tab === 'stats') return
    const needle = q.replace(/[,()%*\\]/g, ' ').trim()
    const build = (useCol) => {
      let query = supabase.from(tab).select('*', { count: 'exact' })
      if (needle) query = useCol && tab !== 'categories'
        ? query.or(`${T.title}.ilike.%${needle}%,search_text.ilike.%${norm(needle)}%`)   // tìm không dấu
        : query.ilike(T.title, `%${needle}%`)
      return query.order('created_at').order('id').range((page - 1) * SIZE, page * SIZE - 1)
    }
    let [r, c] = await Promise.all([build(true), supabase.from('categories').select('id,name')])
    if (r.error) r = await build(false)       // chưa chạy db/06_search.sql
    setRows(r.data || []); setCount(r.count || 0); setCats(c.data || [])
  }
  useEffect(() => { setEdit(null); setPage(1); setQ('') }, [tab])
  useEffect(() => { load() }, [tab, page, q])

  if (profile && profile.role !== 'admin') return <p className="card">Chỉ dành cho quản trị viên.</p>

  const toForm = (row) => Object.fromEntries(T.fields.map(([k, , t]) => [k,
    t === 'lines' ? (row?.[k] || []).join('\n') : t === 'json' ? JSON.stringify(row?.[k] ?? [], null, 1) : row?.[k] ?? (t === 'bool' ? true : '')]))

  const save = async (e) => {
    e.preventDefault(); setErr('')
    const body = {}
    try {
      for (const [k, , t] of T.fields) {
        const v = edit.form[k]
        body[k] = t === 'lines' ? v.split('\n').map(x => x.trim()).filter(Boolean)
          : t === 'json' ? JSON.parse(v || '[]') : t === 'number' ? Number(v) : t === 'cat' && !v ? null : v
      }
    } catch { return setErr('JSON không hợp lệ') }
    const q = edit.id ? supabase.from(tab).update(body).eq('id', edit.id) : supabase.from(tab).insert(body)
    const { error } = await q
    if (error) return setErr(error.message)
    setEdit(null); load()
  }
  const del = async (id) => {
    if (!window.confirm('Xóa mục này?')) return
    const { error } = await supabase.from(tab).delete().eq('id', id)
    if (error) setErr(error.message); else load()
  }

  return (
    <>
      <PageHeader zh="管理" title="Quản trị nội dung" crumbs={[[null, 'Quản trị']]} sub="Thống kê hoạt động và quản lý ngành, tình huống, từ vựng." />
      <div className="chips"><button className={tab === 'stats' ? 'chip on' : 'chip'} onClick={() => setTab('stats')}>统计 Thống kê</button>{Object.entries(TABLES).map(([k, v]) =>
        <button key={k} className={tab === k ? 'chip on' : 'chip'} onClick={() => setTab(k)}>{v.label}</button>)}
        {tab !== 'stats' && <button className="btn sm" onClick={() => setEdit({ form: toForm(null) })}>+ Thêm</button>}</div>
      {tab === 'stats' ? <Stats /> : <>
      {err && <p className="msg">{err}</p>}
      {edit && (
        <form className="card form" onSubmit={save}>
          {T.fields.map(([k, label, t]) => (
            <label key={k}>{label}
              {t === 'bool' ? <input type="checkbox" checked={!!edit.form[k]} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.checked } })} />
                : Array.isArray(t) ? <select value={edit.form[k]} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })}>{t.map(o => <option key={o}>{o}</option>)}</select>
                : t === 'cat' ? <select value={edit.form[k] || ''} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })}><option value="">—</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                : ['area', 'lines', 'json'].includes(t) ? <textarea rows={4} value={edit.form[k]} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })} />
                : <input type={t === 'number' ? 'number' : 'text'} value={edit.form[k]} onChange={e => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } })} />}
            </label>
          ))}
          <div className="row"><button className="btn">保存</button><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Hủy</button></div>
        </form>
      )}
      <input className="search" style={{ marginBottom: '1rem' }} placeholder="Tìm theo tên…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
      {!rows.length && <Empty zh="空" title="Không có dữ liệu" />}
      <div className="card tbl"><table className="admin-t"><tbody>
        {rows.map(r => (
          <tr key={r.id}><td>{r[T.title]}</td>
            <td style={{ textAlign: 'right' }}>
              <button className="btn ghost sm" onClick={() => setEdit({ id: r.id, form: toForm(r) })}>Sửa</button>{' '}
              <button className="btn ghost sm" onClick={() => del(r.id)}>Xóa</button></td></tr>
        ))}
      </tbody></table></div>
      {count > SIZE && (
        <nav className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="dots">{page} / {Math.ceil(count / SIZE)} · {count} mục</span>
          <button disabled={page * SIZE >= count} onClick={() => setPage(page + 1)}>›</button>
        </nav>
      )}
      </>}
    </>
  )
}
