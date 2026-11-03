import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useMediaUrl } from '../storage.js'

// 5 tab chính; Đã lưu / Quản trị / Đăng xuất nằm ở thanh trên và trang Hồ sơ
const TABS = [
  ['/', '情景', 'Tình huống'],
  ['/vocabulary', '词汇', 'Từ vựng'],
  ['/writing', '写字', 'Luyện viết'],
  ['/exams', '考试', 'Thi thử'],
  ['/translate', '翻译', 'Dịch'],
  ['/profile', '我的', 'Hồ sơ'],
]
const TITLES = {
  '/': ['情景', 'InternChinese'], '/vocabulary': ['词汇', 'Từ vựng'], '/translate': ['翻译', 'Dịch'],
  '/writing': ['写字', 'Luyện viết'], '/exams': ['考试', 'Thi thử'], '/history': ['记录', 'Lịch sử'], '/saved': ['收藏', 'Đã lưu'], '/profile': ['我的', 'Hồ sơ'], '/admin': ['管理', 'Quản trị'],
}

export default function Layout({ children }) {
  const { profile } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const avatar = useMediaUrl(profile?.avatar_url)
  const isRoot = TABS.some(([to]) => to === pathname)
  const fullChat = pathname.startsWith('/practice')
  const [zh, title] = TITLES[pathname] || (pathname.startsWith('/history/') ? ['评价', 'Kết quả'] : ['', ''])

  return (
    <div className={'shell m app' + (fullChat ? ' fullchat' : '')}>
      {!fullChat && (
        <header className="m-top app-bar">
          {isRoot ? (
            pathname === '/'
              ? <div className="brand"><span className="seal">实</span><div><b>InternChinese</b><small>实习汉语</small></div></div>
              : <div className="app-title"><span className="zh">{zh}</span><b>{title}</b></div>
          ) : (
            <div className="app-title"><button className="back" onClick={() => nav(-1)} aria-label="Quay lại">‹</button><span className="zh">{zh}</span><b>{title}</b></div>
          )}
          <div className="app-actions">
            <Link to="/saved" className="app-icon" aria-label="Đã lưu">★</Link>
            <Link to="/profile" className="m-user" aria-label="Hồ sơ">
              {avatar ? <img src={avatar} alt="" className="avatar sm" /> : <span className="seal sm2">{(profile?.full_name || '学')[0]}</span>}
            </Link>
          </div>
        </header>
      )}
      <main className="page">{children}</main>
      {!fullChat && (
        <nav className="tabbar" aria-label="Điều hướng chính">
          {TABS.map(([to, z, vi]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="zh">{z}</span><small>{vi}</small>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
