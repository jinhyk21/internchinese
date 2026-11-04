import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { Empty, Head, Loading, Modal, Pager, Panel, Tag, useToast } from './ui.jsx'
import Picker from './Picker.jsx'
import { downloadCSV, fmtTime, nameOf, profilesById, scoreCls, toCSV } from './lib.js'

const SIZE = 25
const STATUS = { completed: ['Hoàn thành', 'green'], in_progress: ['Đang làm', 'amber'], abandoned: ['Bỏ dở', 'red'] }
const EV = [['overall_score', 'Tổng'], ['pronunciation_score', 'Phát âm'], ['grammar_score', 'Ngữ pháp'], ['vocabulary_score', 'Từ vựng'], ['fluency_score', 'Trôi chảy'], ['communication_score', 'Giao tiếp']]
const list = (v) => Array.isArray(v) ? v : v ? [String(v)] : []

export default function Sessions() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [f, setF] = useState({ q: '', status: '', mode: '', scenario: '', from: '', to: '' })
  const [scs, setScs] = useState([])
  const [detail, setDetail] = useState(null)
  const [sel, setSel] = useState(new Set())
  const [form, setForm] = useState(null)      // thêm / sửa buổi luyện
  const [msgEdit, setMsgEdit] = useState(null)  // { id, content }
  const [evForm, setEvForm] = useState(null)
  const upd = (k, v) => { setF(x => ({ ...x, [k]: v })); setPage(1) }

  useEffect(() => { supabase.from('scenarios').select('id,title').order('title').then(r => setScs(r.data || [])) }, [])

  const load = async () => {
    let query = supabase.from('conversation_sessions').select('id,user_id,scenario_id,title,status,communication_mode,duration_seconds,created_at,scenarios(title)', { count: f.q || f.status || f.mode || f.scenario || f.from || f.to ? 'exact' : 'planned' })
    if (f.q.trim()) {
      const needle = f.q.replace(/[,()%*\\]/g, ' ').trim()
      const { data } = await supabase.from('profiles').select('id').or(`full_name.ilike.%${needle}%,student_code.ilike.%${needle}%`).limit(200)
      query = query.in('user_id', (data || []).map(x => x.id).concat('00000000-0000-0000-0000-000000000000'))
    }
    if (f.status) query = query.eq('status', f.status)
    if (f.mode) query = query.eq('communication_mode', f.mode)
    if (f.scenario) query = query.eq('scenario_id', f.scenario)
    if (f.from) query = query.gte('created_at', new Date(f.from).toISOString())
    if (f.to) query = query.lt('created_at', new Date(new Date(f.to).getTime() + 86400000).toISOString())
    const { data, count: c } = await query.order('created_at', { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1)
    const ses = data || []
    const [pm, ev] = await Promise.all([
      profilesById(ses.map(s => s.user_id)),
      ses.length ? supabase.from('conversation_evaluations').select('session_id,overall_score').in('session_id', ses.map(s => s.id)) : { data: [] },
    ])
    const score = Object.fromEntries((ev.data || []).map(e => [e.session_id, e.overall_score]))
    setRows(ses.map(s => ({ ...s, user: pm[s.user_id], sc: s.scenarios?.title, score: score[s.id] }))); setCount(c || 0); setSel(new Set())
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [page, f])

  const open = async (s) => {
    setDetail({ s, loading: true })
    const [m, e] = await Promise.all([
      supabase.from('conversation_messages').select('*').eq('session_id', s.id).order('created_at'),
      supabase.from('conversation_evaluations').select('*').eq('session_id', s.id).maybeSingle(),
    ])
    setDetail({ s, msgs: m.data || [], ev: e.data })
  }
  const saveSession = async (e) => {
    e.preventDefault()
    const row = { user_id: form.user_id, scenario_id: form.scenario_id || null, title: form.title, status: form.status, communication_mode: form.communication_mode, duration_seconds: Number(form.duration_seconds) || 0 }
    if (!row.user_id) return toast('Chọn học viên', 'err')
    const { error } = form.id ? await supabase.from('conversation_sessions').update(row).eq('id', form.id) : await supabase.from('conversation_sessions').insert(row)
    if (error) return toast(error.message, 'err')
    toast('Đã lưu'); setForm(null); setDetail(null); load()
  }
  const saveMsg = async () => {
    const { error } = await supabase.from('conversation_messages').update({ content: msgEdit.content }).eq('id', msgEdit.id)
    if (error) return toast(error.message, 'err')
    setDetail(d => ({ ...d, msgs: d.msgs.map(m => m.id === msgEdit.id ? { ...m, content: msgEdit.content } : m) })); setMsgEdit(null); toast('Đã sửa tin nhắn')
  }
  const delMsg = async (id) => {
    if (!window.confirm('Xóa tin nhắn này?')) return
    const { error } = await supabase.from('conversation_messages').delete().eq('id', id)
    if (error) return toast(error.message, 'err')
    setDetail(d => ({ ...d, msgs: d.msgs.filter(m => m.id !== id) })); toast('Đã xóa')
  }
  const saveEv = async (e) => {
    e.preventDefault()
    const body = Object.fromEntries(EV.map(([k]) => [k, Math.max(0, Math.min(100, Number(evForm[k]) || 0))]))
    const { data, error } = evForm.id
      ? await supabase.from('conversation_evaluations').update(body).eq('id', evForm.id).select().single()
      : await supabase.from('conversation_evaluations').insert({ ...body, session_id: detail.s.id, user_id: detail.s.user_id }).select().single()
    if (error) return toast(error.message, 'err')
    setDetail(d => ({ ...d, ev: data })); setEvForm(null); toast('Đã lưu đánh giá'); load()
  }
  const delEv = async () => {
    if (!window.confirm('Xóa đánh giá của buổi này?')) return
    const { error } = await supabase.from('conversation_evaluations').delete().eq('id', detail.ev.id)
    if (error) return toast(error.message, 'err')
    setDetail(d => ({ ...d, ev: null })); toast('Đã xóa đánh giá'); load()
  }
  const remove = async (ids) => {
    if (!window.confirm(`Xóa ${ids.length} buổi luyện cùng tin nhắn và đánh giá?`)) return
    await supabase.from('conversation_evaluations').delete().in('session_id', ids)
    await supabase.from('conversation_messages').delete().in('session_id', ids)
    const { error } = await supabase.from('conversation_sessions').delete().in('id', ids)
    if (error) return toast(error.message, 'err')
    toast('Đã xóa'); setDetail(null); load()
  }
  const exportCsv = () => {
    downloadCSV('buoi-luyen-tap.csv', toCSV((rows || []).map(r => ({ id: r.id, hoc_vien: nameOf(r.user), tinh_huong: r.sc, che_do: r.communication_mode, trang_thai: r.status, giay: r.duration_seconds, diem: r.score, ngay: r.created_at })), ['id', 'hoc_vien', 'tinh_huong', 'che_do', 'trang_thai', 'giay', 'diem', 'ngay']))
  }
  const allOn = rows?.length && rows.every(r => sel.has(r.id))

  return (
    <>
      <Head title="Buổi luyện tập" sub="Xem toàn bộ hội thoại và đánh giá của học viên."><button className="a-btn ghost" onClick={exportCsv}>⬇ CSV trang này</button>
        <button className="a-btn" onClick={() => setForm({ user_id: '', scenario_id: '', title: '', status: 'completed', communication_mode: 'text', duration_seconds: 0 })}>＋ Thêm</button></Head>
      <Panel>
        <div className="a-bar">
          <input className="a-in grow" placeholder="Tìm theo học viên…" value={f.q} onChange={e => upd('q', e.target.value)} />
          <select className="a-sel" value={f.scenario} onChange={e => upd('scenario', e.target.value)}><option value="">Mọi tình huống</option>{scs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <select className="a-sel" value={f.status} onChange={e => upd('status', e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
          <select className="a-sel" value={f.mode} onChange={e => upd('mode', e.target.value)}><option value="">Mọi hình thức</option><option value="text">Văn bản</option><option value="voice">Giọng nói</option></select>
          <input className="a-in" type="date" value={f.from} onChange={e => upd('from', e.target.value)} title="Từ ngày" />
          <input className="a-in" type="date" value={f.to} onChange={e => upd('to', e.target.value)} title="Đến ngày" />
        </div>
        {sel.size > 0 && <div className="a-sel-bar"><b>Đã chọn {sel.size}</b><button className="a-btn sm danger" onClick={() => remove([...sel])}>Xóa</button><button className="a-btn sm ghost" onClick={() => setSel(new Set())}>Bỏ chọn</button></div>}
        {rows === null ? <Loading /> : !rows.length ? <Empty /> : (
          <div className="a-table"><table>
            <thead><tr><th><input type="checkbox" checked={!!allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map(r => r.id)))} /></th><th>Học viên</th><th>Tình huống</th><th>Hình thức</th><th>Trạng thái</th><th className="r">Thời lượng</th><th className="r">Điểm</th><th>Thời gian</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="click" onClick={() => open(r)}>
                <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })} /></td>
                <td>{nameOf(r.user)}</td><td>{r.sc || r.title || '—'}</td><td>{r.communication_mode === 'voice' ? '🎙 Giọng nói' : '⌨ Văn bản'}</td>
                <td><Tag kind={(STATUS[r.status] || [])[1]}>{(STATUS[r.status] || [r.status])[0]}</Tag></td>
                <td className="r">{Math.round((r.duration_seconds || 0) / 60)} phút</td>
                <td className="r">{r.score != null ? <Tag kind={scoreCls(r.score)}>{Math.round(r.score)}</Tag> : '—'}</td><td>{fmtTime(r.created_at)}</td>
              </tr>))}</tbody></table></div>
        )}
        <Pager page={page} size={SIZE} count={count} onChange={setPage} />
      </Panel>

      {detail && (
        <Modal title={`${nameOf(detail.s.user)} · ${detail.s.sc || detail.s.title || ''}`} onClose={() => setDetail(null)} wide>
          {detail.loading ? <Loading /> : (
            <>
              {detail.ev ? (
                <div className="a-kv" style={{ marginBottom: '1rem' }}>
                  {EV.map(([k, l]) => <div key={k}><small>{l}</small><b>{Math.round(detail.ev[k] || 0)}</b></div>)}
                </div>
              ) : <p style={{ color: 'var(--mut)', marginBottom: '1rem' }}>Buổi này chưa có đánh giá.</p>}
              <div className="a-actions" style={{ marginBottom: '1rem' }}>
                <button className="a-btn ghost sm" onClick={() => setEvForm({ ...Object.fromEntries(EV.map(([k]) => [k, 0])), ...(detail.ev || {}) })}>{detail.ev ? '✎ Sửa điểm' : '＋ Thêm đánh giá'}</button>
                {detail.ev && <button className="a-btn danger sm" onClick={delEv}>Xóa đánh giá</button>}
              </div>
              {detail.ev && <div className="a-grid g2">
                <div><h3>Điểm mạnh</h3><ul>{list(detail.ev.strengths).map((x, i) => <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>)}</ul></div>
                <div><h3>Cần cải thiện</h3><ul>{list(detail.ev.weaknesses).map((x, i) => <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>)}</ul></div>
              </div>}
              {detail.ev?.detailed_feedback?.summary && <p style={{ margin: '.6rem 0 1rem' }}>{detail.ev.detailed_feedback.summary}</p>}
              <h3 style={{ marginBottom: '.6rem' }}>Hội thoại ({detail.msgs.length})</h3>
              <div className="a-chat">{detail.msgs.map(m => (
                <div key={m.id} className={m.sender === 'user' ? 'me' : ''}>
                  {msgEdit?.id === m.id ? <><textarea className="a-in" rows={3} style={{ width: '100%' }} value={msgEdit.content} onChange={e => setMsgEdit({ ...msgEdit, content: e.target.value })} />
                    <button className="a-btn sm" onClick={saveMsg}>Lưu</button> <button className="a-btn ghost sm" onClick={() => setMsgEdit(null)}>Hủy</button></>
                    : <>{m.content}{m.pinyin && <small>{m.pinyin}</small>}{m.translated_content && <small>{m.translated_content}</small>}
                      <small><a href="#" onClick={e => { e.preventDefault(); setMsgEdit({ id: m.id, content: m.content }) }}>sửa</a> · <a href="#" onClick={e => { e.preventDefault(); delMsg(m.id) }}>xóa</a></small></>}
                </div>
              ))}</div>
              <div className="a-actions" style={{ marginTop: '1rem' }}><button className="a-btn ghost" onClick={() => setForm({ ...detail.s })}>✎ Sửa buổi</button><button className="a-btn danger" onClick={() => remove([detail.s.id])}>🗑 Xóa buổi này</button></div>
            </>
          )}
        </Modal>
      )}
    {form && (
        <Modal title={form.id ? 'Sửa buổi luyện' : 'Thêm buổi luyện'} onClose={() => setForm(null)}>
          <form className="a-form" onSubmit={saveSession}>
            <label className="full">Học viên<Picker table="profiles" value={form.user_id} onChange={v => setForm({ ...form, user_id: v })} /></label>
            <label className="full">Tình huống<select className="a-sel" value={form.scenario_id || ''} onChange={e => setForm({ ...form, scenario_id: e.target.value })}><option value="">—</option>{scs.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
            <label className="full">Tiêu đề<input className="a-in" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
            <label>Trạng thái<select className="a-sel" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
            <label>Hình thức<select className="a-sel" value={form.communication_mode || 'text'} onChange={e => setForm({ ...form, communication_mode: e.target.value })}><option value="text">Văn bản</option><option value="voice">Giọng nói</option></select></label>
            <label>Thời lượng (giây)<input className="a-in" type="number" min="0" value={form.duration_seconds || 0} onChange={e => setForm({ ...form, duration_seconds: e.target.value })} /></label>
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setForm(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
      {evForm && (
        <Modal title="Điểm đánh giá" onClose={() => setEvForm(null)}>
          <form className="a-form" onSubmit={saveEv}>
            {EV.map(([k, l]) => <label key={k}>{l} (0-100)<input className="a-in" type="number" min="0" max="100" value={evForm[k]} onChange={e => setEvForm({ ...evForm, [k]: e.target.value })} /></label>)}
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setEvForm(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
