import { useEffect, useMemo, useState } from 'react'
import { Columns, Empty, Head, Kpi, Loading, Modal, Pager, Panel, Tag, useToast } from './ui.jsx'
import Picker from './Picker.jsx'
import { supabase } from '../../supabase'
import { avg, downloadCSV, fmtTime, nameOf, pageAll, profilesById, scoreCls, toCSV } from './lib.js'

const SIZE = 25
const trackName = (t, cats) => t.startsWith('cat:') ? 'Ngành: ' + (cats[t.slice(4)] || '…') : t

export default function Exams() {
  const toast = useToast()
  const [all, setAll] = useState(null)
  const [pm, setPm] = useState({})
  const [cats, setCats] = useState({})
  const [f, setF] = useState({ q: '', track: '', min: '', max: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(new Set())
  const [edit, setEdit] = useState(null)
  const upd = (k, v) => { setF(x => ({ ...x, [k]: v })); setPage(1) }

  const load = async () => {
    const [r, c] = await Promise.all([pageAll('exam_results', '*'), supabase.from('categories').select('id,name')])
    const rows = r.data.sort((a, b) => b.created_at.localeCompare(a.created_at))
    setCats(Object.fromEntries((c.data || []).map(x => [x.id, x.name]))); setPm(await profilesById(rows.map(x => x.user_id))); setAll(rows); setSel(new Set())
  }
  useEffect(() => { load() }, [])

  const rows = useMemo(() => (all || []).filter(r => {
    if (f.q && !nameOf(pm[r.user_id]).toLowerCase().includes(f.q.toLowerCase())) return false
    if (f.track && r.track !== f.track) return false
    if (f.min !== '' && r.score < Number(f.min)) return false
    if (f.max !== '' && r.score > Number(f.max)) return false
    if (f.from && new Date(r.created_at) < new Date(f.from)) return false
    if (f.to && new Date(r.created_at) >= new Date(new Date(f.to).getTime() + 86400000)) return false
    return true
  }), [all, pm, f])
  const tracks = useMemo(() => [...new Set((all || []).map(r => r.track))].sort(), [all])
  const hist = useMemo(() => [...Array(10)].map((_, i) => ({ label: `${i * 10}`, value: rows.filter(r => Math.min(9, Math.floor(r.score / 10)) === i).length, color: i < 6 ? 'var(--rd)' : i < 8 ? 'var(--am)' : 'var(--gn)' })), [rows])

  const remove = async (ids) => {
    if (!window.confirm(`Xóa ${ids.length} kết quả thi?`)) return
    const { error } = await supabase.from('exam_results').delete().in('id', ids)
    if (error) return toast(error.message, 'err')
    toast('Đã xóa'); load()
  }
  const save = async (e) => {
    e.preventDefault()
    const f = edit.form
    const row = { user_id: f.user_id, track: f.track.trim(), exam_no: Number(f.exam_no), score: Number(f.score), correct: Number(f.correct), total: Number(f.total), duration_seconds: Number(f.duration_seconds) || 0 }
    if (!row.user_id || !row.track) return toast('Chọn học viên và nhập bài thi', 'err')
    const { error } = edit.id ? await supabase.from('exam_results').update(row).eq('id', edit.id) : await supabase.from('exam_results').insert(row)
    if (error) return toast(error.message, 'err')
    toast('Đã lưu'); setEdit(null); load()
  }
  const blank = { user_id: '', track: 'HSK 1', exam_no: 1, score: 0, correct: 0, total: 0, duration_seconds: 0 }
  const setE = (k, v) => setEdit(x => ({ ...x, form: { ...x.form, [k]: v } }))
  if (!all) return <Loading />
  const view = rows.slice((page - 1) * SIZE, page * SIZE)
  const allOn = view.length && view.every(r => sel.has(r.id))
  return (
    <>
      <Head title="Kết quả thi" sub="Toàn bộ lượt thi thử của học viên.">
        <button className="a-btn" onClick={() => setEdit({ form: blank })}>＋ Thêm</button>
        <button className="a-btn ghost" onClick={() => downloadCSV('ket-qua-thi.csv', toCSV(rows.map(r => ({ ...r, hoc_vien: nameOf(pm[r.user_id]) })), ['hoc_vien', 'track', 'exam_no', 'score', 'correct', 'total', 'duration_seconds', 'created_at']))}>⬇ CSV</button>
      </Head>
      <div className="a-grid g-kpi">
        <Kpi label="Lượt thi" value={rows.length} />
        <Kpi tone="green" label="Điểm trung bình" value={Math.round(avg(rows, r => r.score)) || '—'} />
        <Kpi tone="violet" label="Tỉ lệ đạt (≥60)" value={`${Math.round(rows.filter(r => r.score >= 60).length / Math.max(1, rows.length) * 100)}%`} />
        <Kpi tone="amber" label="Thời gian TB" value={`${Math.round(avg(rows, r => r.duration_seconds) / 60)} phút`} />
      </div>
      <Panel title="Phân bố điểm"><Columns items={hist} height={130} /></Panel>
      <div style={{ height: '1rem' }} />
      <Panel>
        <div className="a-bar">
          <input className="a-in grow" placeholder="Tìm học viên…" value={f.q} onChange={e => upd('q', e.target.value)} />
          <select className="a-sel" value={f.track} onChange={e => upd('track', e.target.value)}><option value="">Mọi bài thi</option>{tracks.map(t => <option key={t} value={t}>{trackName(t, cats)}</option>)}</select>
          <input className="a-in" style={{ width: 90 }} type="number" placeholder="Điểm ≥" value={f.min} onChange={e => upd('min', e.target.value)} />
          <input className="a-in" style={{ width: 90 }} type="number" placeholder="Điểm ≤" value={f.max} onChange={e => upd('max', e.target.value)} />
          <input className="a-in" type="date" value={f.from} onChange={e => upd('from', e.target.value)} />
          <input className="a-in" type="date" value={f.to} onChange={e => upd('to', e.target.value)} />
        </div>
        {sel.size > 0 && <div className="a-sel-bar"><b>Đã chọn {sel.size}</b><button className="a-btn sm danger" onClick={() => remove([...sel])}>Xóa</button><button className="a-btn sm ghost" onClick={() => setSel(new Set())}>Bỏ chọn</button></div>}
        {!view.length ? <Empty /> : (
          <div className="a-table"><table>
            <thead><tr><th><input type="checkbox" checked={!!allOn} onChange={() => setSel(allOn ? new Set() : new Set(view.map(r => r.id)))} /></th><th>Học viên</th><th>Bài thi</th><th>Đề</th><th className="r">Điểm</th><th className="r">Đúng</th><th className="r">Thời gian</th><th>Ngày</th><th className="r">Thao tác</th></tr></thead>
            <tbody>{view.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })} /></td>
                <td>{nameOf(pm[r.user_id])}</td><td>{trackName(r.track, cats)}</td><td>#{r.exam_no}</td>
                <td className="r"><Tag kind={scoreCls(r.score)}>{r.score}</Tag></td><td className="r">{r.correct}/{r.total}</td><td className="r">{Math.round(r.duration_seconds / 60)}′</td><td>{fmtTime(r.created_at)}</td>
                <td className="r"><button className="a-btn ghost sm" onClick={() => setEdit({ id: r.id, form: { ...blank, ...r } })}>Sửa</button>{' '}<button className="a-btn danger sm" onClick={() => remove([r.id])}>Xóa</button></td>
              </tr>))}</tbody></table></div>
        )}
        <Pager page={page} size={SIZE} count={rows.length} onChange={setPage} />
      </Panel>
    {edit && (
        <Modal title={edit.id ? 'Sửa kết quả thi' : 'Thêm kết quả thi'} onClose={() => setEdit(null)}>
          <form className="a-form" onSubmit={save}>
            <label className="full">Học viên<Picker table="profiles" value={edit.form.user_id} onChange={v => setE('user_id', v)} /></label>
            <label>Bài thi (vd: HSK 3 hoặc cat:&lt;id ngành&gt;)<input className="a-in" value={edit.form.track} onChange={e => setE('track', e.target.value)} /></label>
            <label>Số đề<input className="a-in" type="number" min="1" value={edit.form.exam_no} onChange={e => setE('exam_no', e.target.value)} /></label>
            <label>Điểm (0-100)<input className="a-in" type="number" min="0" max="100" value={edit.form.score} onChange={e => setE('score', e.target.value)} /></label>
            <label>Số câu đúng<input className="a-in" type="number" min="0" value={edit.form.correct} onChange={e => setE('correct', e.target.value)} /></label>
            <label>Tổng số câu<input className="a-in" type="number" min="0" value={edit.form.total} onChange={e => setE('total', e.target.value)} /></label>
            <label>Thời gian (giây)<input className="a-in" type="number" min="0" value={edit.form.duration_seconds} onChange={e => setE('duration_seconds', e.target.value)} /></label>
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setEdit(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
