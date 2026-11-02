import { Link } from 'react-router-dom'

export default function Footer({ compact }) {
  return (
    <footer className={'foot' + (compact ? ' compact' : '')}>
      <div className="foot-pattern" />
      <div className="foot-in">
        <div className="foot-brand">
          <span className="seal">实</span>
          <div>
            <b>InternChinese · 实习汉语</b>
            <p><span className="zh">学以致用</span> — Học để dùng. Luyện giao tiếp tiếng Trung qua tình huống thực tập thật.</p>
          </div>
        </div>
        {!compact && (
          <>
            <div className="foot-links">
              <h5>快速链接 · Truy cập nhanh</h5>
              <Link to="/">Tình huống</Link><Link to="/vocabulary">Từ vựng HSK 1–9</Link>
              <Link to="/history">Lịch sử luyện tập</Link><Link to="/profile">Hồ sơ</Link>
            </div>
            <div className="foot-links">
              <h5>学习 · Học tập</h5>
              <span>6 ngành thực tập</span><span>Hội thoại cùng AI</span><span>Chấm điểm &amp; sửa lỗi</span>
            </div>
          </>
        )}
      </div>
      <div className="foot-copy">© {new Date().getFullYear()} InternChinese · 实习汉语 · 学无止境</div>
    </footer>
  )
}
