import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useToast } from '../toast.jsx'

export default function Reset() {
  const nav = useNavigate()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { toast(error.message, 'err'); return setMsg(error.message) }
    toast('Đã đặt mật khẩu mới'); nav('/')
  }
  return (
    <div className="login-wrap">
      <div className="login-art">
        <span className="seal big">密</span>
        <h2 className="title-zh">重置密码</h2>
        <p>Đặt lại mật khẩu để tiếp tục hành trình luyện tiếng Trung thực tập của bạn.</p>
      </div>
      <div className="login-card">
        <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
        <span className="seal big">密</span><h1 className="title-zh">重置密码</h1>
        <p className="sub">Đặt mật khẩu mới</p>
        <form onSubmit={submit}>
          <label>Mật khẩu mới<input type="password" minLength={6} required value={pw} onChange={e => setPw(e.target.value)} /></label>
          {msg && <p className="msg">{msg}</p>}
          <button className="btn">保存 · Lưu</button>
        </form>
      </div>
    </div>
  )
}
