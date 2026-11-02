import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'

export default function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ email: '', password: '', full_name: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/" replace />

  const forgot = async () => {
    if (!f.email) return setMsg('Nhập email trước rồi bấm "Quên mật khẩu".')
    const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: window.location.origin + '/reset' })
    setMsg(error ? error.message : 'Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư.')
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error, data } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
      : await supabase.auth.signUp({ email: f.email, password: f.password, options: { data: { full_name: f.full_name }, emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'register' && !data.session) setMsg('Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản.')
  }

  return (
    <div className="login-wrap">
      <div className="login-art">
        <span className="seal big">实</span>
        <h2 className="title-zh">学以致用</h2>
        <p>Luyện giao tiếp tiếng Trung qua các tình huống thực tập thật: văn phòng, kinh doanh, xuất nhập khẩu, du lịch, nhân sự, nhà máy.</p>
        <ul><li>AI đóng vai đồng nghiệp, khách hàng, quản lý</li><li>Từ vựng theo ngành kèm pinyin</li><li>Chấm điểm và sửa lỗi sau mỗi buổi</li></ul>
      </div>
      <div className="login-card">
        <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
        <span className="seal big">实</span>
        <h1 className="title-zh">实习汉语</h1>
        <p className="sub">InternChinese · Luyện giao tiếp tiếng Trung nơi công sở</p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>Họ và tên<input required value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></label>
          )}
          <label>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
          <label>Mật khẩu<input type="password" minLength={6} required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
          {msg && <p className="msg">{msg}</p>}
          <button className="btn" disabled={busy}>{mode === 'login' ? '登录 · Đăng nhập' : '注册 · Đăng ký'}</button>
        </form>
        {mode === 'login' && <button className="link" onClick={forgot}>Quên mật khẩu?</button>}<br />
        <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg('') }}>
          {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>
    </div>
  )
}
