import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth.jsx'
import { ToastHost } from './ui.jsx'
import './admin.css'

const NAV = [
  ['Tổng quan'],
  ['/admin', '◈', 'Dashboard', true],
  ['Người dùng'],
  ['/admin/users', '☻', 'Tài khoản'],
  ['Nội dung'],
  ['/admin/categories', '▦', 'Ngành'],
  ['/admin/scenarios', '✦', 'Tình huống'],
  ['/admin/vocabulary', '文', 'Từ vựng'],
  ['Hoạt động'],
  ['/admin/sessions', '☍', 'Buổi luyện tập'],
  ['/admin/exams', '✎', 'Kết quả thi'],
  ['/admin/saved', '★', 'Đã lưu & tiến độ'],
]

// Cổng quyền: luôn hỏi lại DB (profiles.role) mỗi lần vào khu quản trị, không tin dữ liệu phía trình duyệt.
export default function AdminLayout() {
  const { session, profile } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [ok, setOk] = useState(null)
  const [open, setOpen] = useState(false)
  const uid = session?.user?.id

  useEffect(() => {
    if (!uid) return
    let live = true
    supabase.from('profiles').select('role,is_active').eq('id', uid).maybeSingle()
      .then(({ data }) => { if (live) setOk(data?.role === 'admin' && data?.is_active !== false) })
    return () => { live = false }
  }, [uid])
  useEffect(() => { setOpen(false) }, [pathname])

  if (!session) return <Navigate to="/login" replace />
  if (ok === null) return <div className="adm" style={{ display: 'grid', placeItems: 'center' }}><div className="a-loading"><i /><i /><i /></div></div>
  if (!ok) return <Navigate to="/" replace />

  const name = profile?.full_name || session.user.email
  const logout = async () => { await supabase.auth.signOut(); nav('/login') }
  return (
    <ToastHost>
      <div className="adm">
        <aside className={'a-side' + (open ? ' open' : '')}>
          <div className="a-brand"><span className="logo">管</span><div><b>InternChinese</b><small>Admin Console</small></div></div>
          <nav className="a-nav">
            {NAV.map(([a, ic, label, end]) => ic === undefined
              ? <span key={a} className="grp">{a}</span>
              : <NavLink key={a} to={a} end={end} className={({ isActive }) => isActive ? 'active' : ''}><span className="ic">{ic}</span>{label}</NavLink>)}
            <Link to="/" style={{ marginTop: '.8rem' }}><span className="ic">↩</span>Về trang học viên</Link>
          </nav>
          <div className="a-me">
            <span className="av">{(name || 'A')[0].toUpperCase()}</span>
            <div><b>{name}</b><small>Quản trị viên</small></div>
            <button className="a-btn ghost sm" onClick={logout} title="Đăng xuất">⏻</button>
          </div>
        </aside>
        <div className="a-main">
          <div className="a-top"><button className="a-burger" onClick={() => setOpen(v => !v)}>☰</button><b>Admin Console</b><span /></div>
          <main className="a-content"><Outlet /></main>
        </div>
      </div>
    </ToastHost>
  )
}
