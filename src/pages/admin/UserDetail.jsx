import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth.jsx'
import { Empty, Head, Loading, Modal, Panel, Radar, Tag, useToast } from './ui.jsx'
import { avg, countOf, fmtDate, fmtTime, nameOf, scoreCls } from './lib.js'
import { roleTag } from './Users.jsx'

const FIELDS = [['full_name', 'Họ tên'], ['university', 'Trường'], ['student_code', 'Mã sinh viên'], ['chinese_level', 'Trình độ tiếng Trung'], ['internship_field', 'Lĩnh vực thực tập']]
const AXES = [['pronunciation_score', 'Phát âm'], ['grammar_score', 'Ngữ pháp'], ['vocabulary_score', 'Từ vựng'], ['fluency_score', 'Trôi chảy'], ['communication_score', 'Giao tiếp']]

export default function UserDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [p, setP] = useState(undefined)
  const [d, setD] = useState(null)
  const [edit, setEdit] = useState(null)
  const me = id === user.id

  const load = async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    setP(prof)
    if (!prof) return
    const [ses, ev, ex, bm, uv, sc] = await Promise.all([
      supabase.from('conversation_sessions').select('id,scenario_id,status,created_at,duration_seconds,communication_mode').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
      supabase.from('conversation_evaluations').select('*').eq('user_id', id).limit(500),
      supabase.from('exam_results').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
      countOf('bookmarks', q => q.eq('user_id', id)), countOf('user_vocabulary', q => q.eq('user_id', id)),
      supabase.from('scenarios').select('id,title'),
    ])
    setD({ ses: ses.data || [], ev: ev.data || [], ex: ex.data || [], bm, uv, sc: Object.fromEntries((sc.data || []).map(s => [s.id, s.title])) })
  }
  useEffect(() => { load() }, [id])

  const patch = async (body, msg) => {
    const { error } = await supabase.from('profiles').update(body).eq('id', id)
    if (error) return toast(error.message, 'err')
    toast(msg); setEdit(null); load()
  }
  const remove = async () => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản "${nameOf(p)}" cùng toàn bộ dữ liệu học tập?`)) return
    const { error } = await supabase.rpc('admin_delete_user', { target: id })
    if (error) return toast(error.message, 'err')
    toast('Đã xóa tài khoản'); nav('/admin/users')
  }

  if (p === undefined) return <Loading />
  if (p === null) return <Empty text="Không tìm thấy người dùng" />
  const evAvg = AXES.map(([k, label]) => ({ label, value: avg(d?.ev || [], x => x[k]) }))
  return (
    <>
      <Head title={nameOf(p)} sub={<><Link to="/admin/users">← Danh sách</Link> · {p.email || p.id}</>}>
        {roleTag(p.role)} {p.is_active === false ? <Tag kind="red">Đã khóa</Tag> : <Tag kind="green">Hoạt động</Tag>}
        <button className="a-btn ghost" onClick={() => setEdit({ ...Object.fromEntries(FIELDS.map(([k]) => [k, p[k] || ''])) })}>✎ Sửa hồ sơ</button>
      </Head>
      <div className="a-grid g2">
        <Panel title="Thông tin">
          <div className="a-kv">
            <div><small>Tham gia</small><b>{fmtDate(p.created_at)}</b></div>
            <div><small>Trường</small><b>{p.university || '—'}</b></div>
            <div><small>Mã SV</small><b>{p.student_code || '—'}</b></div>
            <div><small>Trình độ</small><b>{p.chinese_level || '—'}</b></div>
            <div><small>Thực tập</small><b>{p.internship_field || '—'}</b></div>
          </div>
        </Panel>
        <Panel title="Hành động quản trị" hint={me ? 'Không thể tự thao tác lên chính mình' : undefined}>
          <div className="a-bar">
            <select className="a-sel" disabled={me} value={p.role === 'admin' ? 'admin' : 'student'} onChange={e => patch({ role: e.target.value }, 'Đã đổi vai trò')}>
              <option value="student">Học viên (student)</option><option value="admin">Quản trị (admin)</option>
            </select>
            <button className="a-btn" disabled={me} onClick={() => patch({ is_active: p.is_active === false }, p.is_active === false ? 'Đã mở khóa' : 'Đã khóa tài khoản')}>{p.is_active === false ? '🔓 Mở khóa' : '🔒 Khóa tài khoản'}</button>
            <button className="a-btn danger" disabled={me} onClick={remove}>🗑 Xóa tài khoản</button>
          </div>
        </Panel>
      </div>
      {!d ? <Loading /> : (
        <>
          <div className="a-grid g-main">
            <Panel title="Tổng quan học tập">
              <div className="a-kv">
                <div><small>Buổi luyện</small><b>{d.ses.length}</b></div>
                <div><small>Hoàn thành</small><b>{d.ses.filter(s => s.status === 'completed').length}</b></div>
                <div><small>Điểm TB</small><b>{d.ev.length ? Math.round(avg(d.ev, x => x.overall_score)) : '—'}</b></div>
                <div><small>Giờ luyện</small><b>{(d.ses.reduce((t, s) => t + (s.duration_seconds || 0), 0) / 3600).toFixed(1)}h</b></div>
                <div><small>Lượt thi</small><b>{d.ex.length}</b></div>
                <div><small>Đã lưu</small><b>{d.bm}</b></div>
                <div><small>Từ đang học</small><b>{d.uv}</b></div>
              </div>
            </Panel>
            <Panel title="Năng lực"><Radar axes={evAvg} /></Panel>
          </div>
          <div className="a-grid g2">
            <Panel title="Buổi luyện gần đây">
              {!d.ses.length ? <Empty /> : <div className="a-table"><table><thead><tr><th>Tình huống</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
                <tbody>{d.ses.slice(0, 12).map(s => <tr key={s.id}><td>{d.sc[s.scenario_id] || '—'}</td><td>{fmtTime(s.created_at)}</td><td><Tag kind={s.status === 'completed' ? 'green' : 'amber'}>{s.status}</Tag></td></tr>)}</tbody></table></div>}
            </Panel>
            <Panel title="Kết quả thi thử">
              {!d.ex.length ? <Empty /> : <div className="a-table"><table><thead><tr><th>Bài</th><th>Đề</th><th className="r">Điểm</th><th>Ngày</th></tr></thead>
                <tbody>{d.ex.slice(0, 12).map(x => <tr key={x.id}><td>{x.track.startsWith('cat:') ? 'Theo ngành' : x.track}</td><td>#{x.exam_no}</td><td className="r"><Tag kind={scoreCls(x.score)}>{x.score}</Tag></td><td>{fmtDate(x.created_at)}</td></tr>)}</tbody></table></div>}
            </Panel>
          </div>
        </>
      )}
      {edit && (
        <Modal title="Sửa hồ sơ" onClose={() => setEdit(null)}>
          <form className="a-form" onSubmit={e => { e.preventDefault(); patch(edit, 'Đã lưu hồ sơ') }}>
            {FIELDS.map(([k, label]) => <label key={k}>{label}<input className="a-in" value={edit[k]} onChange={e => setEdit({ ...edit, [k]: e.target.value })} /></label>)}
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setEdit(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
