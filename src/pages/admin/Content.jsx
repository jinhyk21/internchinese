import { useEffect, useRef, useState } from 'react'
import { norm } from '../../text.js'
import { supabase } from '../../supabase'
import { Empty, Head, Loading, Modal, Pager, Panel, Tag, useToast } from './ui.jsx'
import { TABLES, downloadCSV, pageAll, parseCSV, toCSV } from './lib.js'

const SIZE = 25
const DIFF = ['beginner', 'intermediate', 'advanced']

// CRUD dùng chung cho categories / scenarios / vocabulary
export default function Content({ table }) {
  const T = TABLES[table]
  const toast = useToast()
  const fileRef = useRef()
  const hasCat = table !== 'categories', hasDiff = table !== 'categories'
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('')
  const [fDiff, setFDiff] = useState('')
  const [fFlag, setFFlag] = useState('')
  const [sel, setSel] = useState(new Set())
  const [edit, setEdit] = useState(null)
  const [dups, setDups] = useState(null)
  const [err, setErr] = useState('')
  const catName = Object.fromEntries(cats.map(c => [c.id, c.name]))

  const build = (useCol, from = (page - 1) * SIZE, to = page * SIZE - 1) => {
    const needle = q.replace(/[,()%*\\]/g, ' ').trim()
    let query = supabase.from(table).select('*', { count: 'exact' })
    if (needle) {
      const parts = T.search.map(c => `${c}.ilike.%${needle}%`)
      if (useCol && table !== 'categories') parts.push(`search_text.ilike.%${norm(needle)}%`)   // tìm không dấu
      query = query.or(parts.join(','))
    }
    if (fCat) query = query.eq('category_id', fCat)
    if (fDiff) query = query.eq('difficulty', fDiff)
    if (fFlag && T.flag) query = query.eq(T.flag, fFlag === '1')
    query = table === 'categories' ? query.order('display_order') : query.order('created_at')
    return query.order('id').range(from, to)
  }
  const load = async () => {
    let r = await build(true)
    if (r.error) r = await build(false)       // chưa chạy db/06_search.sql
    if (r.error) setErr(r.error.message); else setErr('')
    setRows(r.data || []); setCount(r.count || 0)
  }
  const loadCats = async () => setCats((await supabase.from('categories').select('id,name').order('display_order')).data || [])
  useEffect(() => { loadCats() }, [])
  useEffect(() => { setRows(null); setPage(1); setQ(''); setFCat(''); setFDiff(''); setFFlag(''); setSel(new Set()); setEdit(null) }, [table])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [table, page, q, fCat, fDiff, fFlag])

  const toForm = (row) => Object.fromEntries(T.fields.map(([k, , t]) => [k,
    t === 'lines' ? (row?.[k] || []).join('\n') : t === 'json' ? JSON.stringify(row?.[k] ?? [], null, 1) : row?.[k] ?? (t === 'bool' ? true : '')]))
  const fromForm = (f) => {
    const body = {}
    for (const [k, , t] of T.fields) {
      const v = f[k]
      body[k] = t === 'lines' ? v.split('\n').map(x => x.trim()).filter(Boolean)
        : t === 'json' ? JSON.parse(v || '[]') : t === 'number' ? Number(v) : t === 'cat' && !v ? null : v
    }
    return body
  }
  const save = async (e) => {
    e.preventDefault()
    let body
    try { body = fromForm(edit.form) } catch { return toast('JSON không hợp lệ', 'err') }
    const { error } = edit.id ? await supabase.from(table).update(body).eq('id', edit.id) : await supabase.from(table).insert(body)
    if (error) return toast(error.message, 'err')
    toast(edit.id ? 'Đã cập nhật' : 'Đã thêm mới'); setEdit(null); load(); if (table === 'categories') loadCats()
  }
  const del = async (ids) => {
    if (!window.confirm(`Xóa ${ids.length} mục?`)) return
    const { error } = await supabase.from(table).delete().in('id', ids)
    if (error) return toast(error.message, 'err')
    toast(`Đã xóa ${ids.length} mục`); setSel(new Set()); load()
  }
  const bulk = async (body, msg) => {
    const { error } = await supabase.from(table).update(body).in('id', [...sel])
    if (error) return toast(error.message, 'err')
    toast(msg); setSel(new Set()); load()
  }
  const dup = async (row) => {
    const { id, created_at, updated_at, search_text, ...rest } = row
    const { error } = await supabase.from(table).insert({ ...rest, [T.title]: rest[T.title] + ' (bản sao)' })
    if (error) return toast(error.message, 'err'); toast('Đã nhân bản'); load()
  }

  const exportCsv = async () => {
    const { data } = await build(true, 0, 4999)
    downloadCSV(`${table}.csv`, toCSV(data || [], ['id', ...T.fields.map(f => f[0])]))
    toast(`Đã xuất ${(data || []).length} dòng`)
  }
  const importCsv = async (e) => {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    const list = parseCSV(await file.text())
    if (!list.length) return toast('File rỗng hoặc sai định dạng', 'err')
    const byName = Object.fromEntries(cats.flatMap(c => [[c.name, c.id], [c.id, c.id]]))
    const bad = []
    const items = list.map((r, i) => {
      try {
        const o = {}
        for (const [k, , t] of T.fields) {
          const v = r[k]
          if (v === undefined) continue
          o[k] = t === 'lines' ? (v.startsWith('[') ? JSON.parse(v) : v.split('|').map(x => x.trim()).filter(Boolean))
            : t === 'json' ? JSON.parse(v || '[]') : t === 'number' ? Number(v) || 0 : t === 'bool' ? !/^(0|false|no|)$/i.test(v)
            : t === 'cat' ? (byName[v] || null) : v
        }
        if (!o[T.title]) throw new Error('thiếu ' + T.title)
        return o
      } catch (x) { bad.push(`dòng ${i + 2}: ${x.message}`); return null }
    }).filter(Boolean)
    let ok = 0
    for (let i = 0; i < items.length; i += 200) {
      const { error } = await supabase.from(table).insert(items.slice(i, i + 200))
      if (error) { toast(error.message, 'err'); break }
      ok += Math.min(200, items.length - i)
    }
    toast(`Nhập ${ok}/${list.length} dòng${bad.length ? ` · lỗi: ${bad.slice(0, 2).join('; ')}` : ''}`, bad.length || ok < items.length ? 'err' : 'ok')
    load()
  }
  const findDups = async () => {
    setDups('loading')
    const { data } = await pageAll('vocabulary', 'id,chinese,pinyin,vietnamese,created_at')
    const g = {}
    data.forEach(v => { (g[v.chinese.trim()] ||= []).push(v) })
    setDups(Object.entries(g).filter(([, l]) => l.length > 1).map(([zh, l]) => ({ zh, l: l.sort((a, b) => a.created_at.localeCompare(b.created_at)) })))
  }
  const delDup = async (id) => {
    const { error } = await supabase.from('vocabulary').delete().eq('id', id)
    if (error) return toast(error.message, 'err')
    setDups(d => d.map(g => ({ ...g, l: g.l.filter(v => v.id !== id) })).filter(g => g.l.length > 1)); load()
  }

  const allOn = rows?.length && rows.every(r => sel.has(r.id))
  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const set = (k, v) => setEdit(e => ({ ...e, form: { ...e.form, [k]: v } }))

  return (
    <>
      <Head title={T.label} sub={`${T.zh} · ${count.toLocaleString('vi-VN')} mục`}>
        <button className="a-btn ghost" onClick={exportCsv}>⬇ CSV</button>
        <button className="a-btn ghost" onClick={() => fileRef.current.click()}>⬆ Nhập CSV</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
        {table === 'vocabulary' && <button className="a-btn ghost" onClick={findDups}>⧉ Tìm trùng</button>}
        <button className="a-btn" onClick={() => setEdit({ form: toForm(null) })}>＋ Thêm</button>
      </Head>
      <Panel>
        <div className="a-bar">
          <input className="a-in grow" placeholder="Tìm theo tên, nghĩa…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          {hasCat && <select className="a-sel" value={fCat} onChange={e => { setFCat(e.target.value); setPage(1) }}><option value="">Mọi ngành</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          {hasDiff && <select className="a-sel" value={fDiff} onChange={e => { setFDiff(e.target.value); setPage(1) }}><option value="">Mọi độ khó</option>{DIFF.map(x => <option key={x}>{x}</option>)}</select>}
          {T.flag && <select className="a-sel" value={fFlag} onChange={e => { setFFlag(e.target.value); setPage(1) }}><option value="">Mọi trạng thái</option><option value="1">{table === 'scenarios' ? 'Đã xuất bản' : 'Đang hiển thị'}</option><option value="0">Đang ẩn</option></select>}
        </div>
        {sel.size > 0 && (
          <div className="a-sel-bar"><b>Đã chọn {sel.size}</b>
            {T.flag && <><button className="a-btn sm" onClick={() => bulk({ [T.flag]: true }, 'Đã bật')}>Bật / xuất bản</button><button className="a-btn sm ghost" onClick={() => bulk({ [T.flag]: false }, 'Đã ẩn')}>Ẩn</button></>}
            {hasCat && <select className="a-sel" value="" onChange={e => e.target.value && bulk({ category_id: e.target.value === '-' ? null : e.target.value }, 'Đã đổi ngành')}><option value="">Chuyển sang ngành…</option><option value="-">(Không ngành)</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            <button className="a-btn sm danger" onClick={() => del([...sel])}>Xóa</button>
            <button className="a-btn sm ghost" onClick={() => setSel(new Set())}>Bỏ chọn</button>
          </div>
        )}
        {err && <p className="a-msg">{err}</p>}
        {rows === null ? <Loading /> : !rows.length ? <Empty /> : (
          <div className="a-table"><table>
            <thead><tr><th><input type="checkbox" checked={!!allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map(r => r.id)))} /></th>
              <th>{T.label}</th>{hasCat && <th>Ngành</th>}{hasDiff && <th>Độ khó</th>}{T.flag && <th>Trạng thái</th>}<th className="r">Thao tác</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td><b>{r[T.title]}</b><span className="sub">{table === 'vocabulary' ? `${r.pinyin} · ${r.vietnamese}` : table === 'scenarios' ? r.title_zh : r.name_zh}</span></td>
                {hasCat && <td>{catName[r.category_id] || '—'}</td>}
                {hasDiff && <td><Tag kind={{ beginner: 'green', intermediate: 'amber', advanced: 'red' }[r.difficulty]}>{r.difficulty}</Tag></td>}
                {T.flag && <td>{r[T.flag] ? <Tag kind="green">{table === 'scenarios' ? 'Xuất bản' : 'Hiển thị'}</Tag> : <Tag>Ẩn</Tag>}</td>}
                <td className="r">
                  <button className="a-btn ghost sm" onClick={() => setEdit({ id: r.id, form: toForm(r) })}>Sửa</button>{' '}
                  {table !== 'vocabulary' && <><button className="a-btn ghost sm" onClick={() => dup(r)}>Nhân bản</button>{' '}</>}
                  <button className="a-btn danger sm" onClick={() => del([r.id])}>Xóa</button>
                </td>
              </tr>))}</tbody></table></div>
        )}
        <Pager page={page} size={SIZE} count={count} onChange={setPage} />
      </Panel>

      {edit && (
        <Modal title={edit.id ? `Sửa ${T.label.toLowerCase()}` : `Thêm ${T.label.toLowerCase()}`} onClose={() => setEdit(null)} wide>
          <form className="a-form" onSubmit={save}>
            {T.fields.map(([k, label, t]) => {
              const full = ['area', 'lines', 'json'].includes(t)
              return t === 'bool'
                ? <label key={k} className="chk"><input type="checkbox" checked={!!edit.form[k]} onChange={e => set(k, e.target.checked)} />{label}</label>
                : <label key={k} className={full ? 'full' : ''}>{label}
                  {Array.isArray(t) ? <select className="a-sel" value={edit.form[k]} onChange={e => set(k, e.target.value)}>{t.map(o => <option key={o}>{o}</option>)}</select>
                    : t === 'cat' ? <select className="a-sel" value={edit.form[k] || ''} onChange={e => set(k, e.target.value)}><option value="">—</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    : full ? <textarea className="a-in" rows={4} value={edit.form[k]} onChange={e => set(k, e.target.value)} />
                    : <input className="a-in" type={t === 'number' ? 'number' : 'text'} value={edit.form[k]} onChange={e => set(k, e.target.value)} />}
                </label>
            })}
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setEdit(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
      {dups && (
        <Modal title="Từ vựng trùng lặp" onClose={() => setDups(null)} wide>
          {dups === 'loading' ? <Loading /> : !dups.length ? <Empty text="Không có từ trùng 🎉" /> : (
            <>
              <p style={{ color: 'var(--mut)', marginBottom: '.8rem' }}>{dups.length} nhóm trùng chữ Hán. Giữ bản cũ nhất, xóa bản dư.</p>
              {dups.slice(0, 100).map(g => (
                <div key={g.zh} style={{ marginBottom: '.9rem' }}><b style={{ fontSize: '1.1rem' }}>{g.zh}</b>
                  {g.l.map((v, i) => <div key={v.id} className="a-bar" style={{ margin: '.3rem 0' }}><span className="grow">{v.pinyin} — {v.vietnamese}</span>{i === 0 ? <Tag kind="green">giữ</Tag> : <button className="a-btn danger sm" onClick={() => delDup(v.id)}>Xóa</button>}</div>)}</div>
              ))}
            </>
          )}
        </Modal>
      )}
    </>
  )
}
