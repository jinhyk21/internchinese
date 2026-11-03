import { Link } from 'react-router-dom'
import { pageList } from '../paged.js'

// Banner đầu trang: chữ Hán lớn mờ làm nền, breadcrumb, tiêu đề, mô tả, khu vực hành động
export function PageHeader({ zh, title, sub, crumbs = [], children }) {
  return (
    <section className="pagehead" data-zh={zh}>
      <div className="ph-body">
        <nav className="crumbs">
          <Link to="/">首页</Link>
          {crumbs.map(([to, label]) => <span key={label}> › {to ? <Link to={to}>{label}</Link> : label}</span>)}
        </nav>
        <h1><span className="zh">{zh}</span> {title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </section>
  )
}

export function Skeleton({ n = 6, h = 190 }) {
  return <div className="grid">{[...Array(n)].map((_, i) => <div key={i} className="sk" style={{ height: h }} />)}</div>
}

export function Empty({ zh = '空', title, text, to, cta }) {
  return (
    <div className="empty">
      <span className="seal big">{zh}</span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {to && <Link className="btn" to={to}>{cta}</Link>}
    </div>
  )
}

export function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <nav className="pager">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {pageList(page, pages).map(n => typeof n === 'string'
        ? <span key={n} className="dots">…</span>
        : <button key={n} className={n === page ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </nav>
  )
}

// Cuối danh sách cuộn vô hạn: phần tử theo dõi + dòng trạng thái
export function MoreSentinel({ sentinel, done, shown, count }) {
  return done
    ? <p className="resultinfo c">Đã hiển thị toàn bộ {count} mục</p>
    : <div key={shown} ref={sentinel} className="more"><small>Đang tải thêm…</small></div>
}

export const LEVEL ={ beginner: '初级 · Cơ bản', intermediate: '中级 · Trung cấp', advanced: '高级 · Nâng cao' }
export const ICON = { briefcase: '办', handshake: '商', package: '货', plane: '游', users: '人', factory: '工' }

export const scoreClass = (n) => (n >= 80 ? 'good' : n >= 65 ? 'mid' : 'low')
export function ScoreBadge({ value }) {
  if (value == null) return <span className="badge none">—</span>
  return <span className={'badge ' + scoreClass(value)}>{Math.round(value)}</span>
}
