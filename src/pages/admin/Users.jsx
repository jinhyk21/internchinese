import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth.jsx'
import { Seg, Empty, Head, Loading, Pager, Panel, Tag, useToast } from './ui.jsx'
import { downloadCSV, fmtDate, toCSV } from './lib.js'

const SIZE = 25
export const roleTag = (r) => r === 'admin' ? <Tag kind="violet">admin</Tag> : <Tag kind="cyan">{r || 'student'}</Tag>

export default function Users() {
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('created_at.desc')
  const [err, setErr] = useState('')

  const build = (withEmail, p = page) => {
    const needle = q.replace(/[,()%*\\]/g, ' ').trim()
    let query = supabase.from('profiles').select('*', { count: 'exact' })
    if (needle) query = query.or(['full_name', 'student_code', 'university', ...(withEmail ? ['email'] : [])].map(c => `${c}.ilike.%${needle}%`).join(','))
    if (role === 'student') query = query.neq('role', 'admin'); else if (role) query = query.eq('role', role)
    if (status === 'locked') query = query.eq('is_active', false); else if (status === 'active') query = query.neq('is_active', false)
    const [col, dir] = sort.split('.')
    return query.order(col, { ascending: dir === 'asc' }).order('id').range((p - 1) * SIZE, p * SIZE - 1)
  }
  const load = async () => {
    let r = await build(true)
    if (r.error) r = await build(false)          // chưa chạy admin_policies.sql (chưa có cột email)
    if (r.error) { setErr(r.error.message); return setRows([]) }
    setErr(''); setRows(r.data || []); setCount(r.count || 0)
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [page, q, role, status, sort])

  const exportAll = async () => {
    const { data } = await build(true, 1).range(0, 4999)
    downloadCSV('nguoi-dung.csv', toCSV(data || [], ['id', 'full_name', 'email', 'role', 'is_active', 'university', 'student_code', 'chinese_level', 'internship_field', 'created_at']))
    toast('Đã xuất CSV')
  }
  const change = (fn) => (v) => { fn(v); setPage(1) }

  return (
    <>
      <Head title="Tài khoản" sub="Quản lý học viên, phân quyền và khóa tài khoản."><button className="a-btn ghost" onClick={exportAll}>⬇ Xuất CSV</button></Head>
      <Panel>
        <div className="a-bar">
          <input className="a-in grow" placeholder="Tìm tên, email, mã SV, trường…" value={q} onChange={e => change(setQ)(e.target.value)} />
          <Seg value={role} onChange={change(setRole)} options={[['', 'Tất cả'], ['admin', 'Admin'], ['student', 'Học viên']]} />
          <Seg value={status} onChange={change(setStatus)} options={[['', 'Mọi trạng thái'], ['active', 'Hoạt động'], ['locked', 'Đã khóa']]} />
          <select className="a-sel" value={sort} onChange={e => change(setSort)(e.target.value)}><option value="created_at.desc">Mới nhất</option><option value="created_at.asc">Cũ nhất</option><option value="full_name.asc">Tên A→Z</option></select>
        </div>
        {err && <p className="a-msg">{err}</p>}
        {rows === null ? <Loading /> : !rows.length ? <Empty /> : (
          <div className="a-table"><table>
            <thead><tr><th>Học viên</th><th>Vai trò</th><th>Trình độ</th><th>Trường</th><th>Tham gia</th><th>Trạng thái</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="click" onClick={() => nav(`/admin/users/${r.id}`)}>
                <td><b>{r.full_name || '(chưa đặt tên)'}</b>{r.id === user.id && <> <Tag kind="cyan">bạn</Tag></>}<span className="sub">{r.email || r.student_code || r.id.slice(0, 8)}</span></td>
                <td>{roleTag(r.role)}</td><td>{r.chinese_level || '—'}</td><td>{r.university || '—'}</td><td>{fmtDate(r.created_at)}</td>
                <td>{r.is_active === false ? <Tag kind="red">Đã khóa</Tag> : <Tag kind="green">Hoạt động</Tag>}</td>
              </tr>))}</tbody></table></div>
        )}
        <Pager page={page} size={SIZE} count={count} onChange={setPage} />
      </Panel>
    </>
  )
}
