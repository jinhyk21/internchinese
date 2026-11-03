import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { useMediaUrl } from '../storage.js'
import { useBreakpoint } from '../useBreakpoint.js'
import Footer from './Footer.jsx'

const links = [
  ['/', '情景', 'Tình huống'],
  ['/vocabulary', '词汇', 'Từ vựng'],
  ['/writing', '写字', 'Luyện viết'],
  ['/exams', '考试', 'Thi thử'],
  ['/translate', '翻译', 'Dịch'],
  ['/history', '记录', 'Lịch sử'],
  ['/saved', '收藏', 'Đã lưu'],
  ['/profile', '我的', 'Hồ sơ'],
]

export default function Layout({ children }) {
  const { profile } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const bp = useBreakpoint()
  const avatar = useMediaUrl(profile?.avatar_url)
  const items = profile?.role === 'admin' ? [...links, ['/admin', '管理', 'Quản trị']] : links
  const logout = async () => { await supabase.auth.signOut(); nav('/login') }
  const fullChat = bp === 'mobile' && pathname.startsWith('/practice')
  const initial = (profile?.full_name || '学')[0]
  const [more, setMore] = useState(false)
  useEffect(() => { setMore(false) }, [pathname])
  const MAIN = 4   // mobile: 4 tab chính ở dưới; đủ toàn bộ menu nằm trong nút 3 gạch

  const NavItems = () => items.map(([to, zh, vi]) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="zh">{zh}</span><small>{vi}</small>
    </NavLink>
  ))
  const Brand = () => (
    <div className="brand"><span className="seal">实</span>
      <div><b>InternChinese</b><small>实习汉语 · Tiếng Trung thực tập</small></div>
    </div>
  )
  const Avatar = () => avatar ? <img src={avatar} alt="" className="avatar sm" /> : <span className="seal sm2">{initial}</span>

  // ---- MOBILE: thanh trên gọn + tab bar dưới; footer gọn nằm trên tab bar
  if (bp === 'mobile') return (
    <div className={'shell m' + (fullChat ? ' fullchat' : '')}>
      {!fullChat && (
        <header className="m-top">
          <Brand />
          <div className="m-right">
            <button className="m-user" onClick={logout} aria-label="Đăng xuất"><Avatar /></button>
            <button type="button" className="m-burger" onClick={() => setMore(v => !v)} aria-label="Menu" aria-expanded={more}>
              <i /><i /><i />
            </button>
          </div>
        </header>
      )}
      <main className="page">{children}</main>
      {!fullChat && <Footer compact />}
      {!fullChat && more && (
        <div className="menusheet" onClick={() => setMore(false)}>
          <nav onClick={e => e.stopPropagation()}>
            <NavItems />
            <button type="button" className="ms-out" onClick={logout}><span className="zh">退出</span><small>Đăng xuất</small></button>
          </nav>
        </div>
      )}
      {!fullChat && (
        <nav className="tabbar">
          {items.slice(0, MAIN).map(([to, zh, vi]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="zh">{zh}</span><small>{vi}</small>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )

  // ---- TABLET: thanh bên dọc, footer trong vùng nội dung
  if (bp === 'tablet') return (
    <div className="shell t">
      <aside className="rail">
        <span className="seal">实</span>
        <nav><NavItems /></nav>
        <button className="rail-user" onClick={logout} title="Đăng xuất"><Avatar /><small>退出</small></button>
      </aside>
      <div className="t-main">
        <div className="t-head"><b className="zh">实习汉语</b><span>{profile?.full_name || 'Học viên'}</span></div>
        <main className="page">{children}</main>
        <Footer />
      </div>
    </div>
  )

  // ---- DESKTOP: topbar full-width, footer full-width
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <nav><NavItems /></nav>
        <div className="user">
          <Avatar />
          <span>{profile?.full_name || 'Học viên'}</span>
          <button className="btn ghost sm" onClick={logout}>退出</button>
        </div>
      </header>
      <div className="lattice" />
      <main className="page">{children}</main>
      <Footer />
    </div>
  )
}
