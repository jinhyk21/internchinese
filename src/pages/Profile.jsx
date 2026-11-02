import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { uploadMedia, useMediaUrl } from '../storage.js'
import { PageHeader } from '../components/ui.jsx'
import { allLevelStats } from '../hsk.js'

export default function Profile() {
  const { profile, setProfile, user } = useAuth()
  const [f, setF] = useState({})
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(null)
  const [pw, setPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [stats, setStats] = useState(null)
  const [hsk, setHsk] = useState(null)
  const stored = useMediaUrl(f.avatar_url)
  useEffect(() => { if (profile) setF(profile) }, [profile])

  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([
        supabase.from('conversation_sessions').select('status,duration_seconds').eq('user_id', user.id).limit(1000),
        supabase.from('conversation_evaluations').select('overall_score').eq('user_id', user.id).limit(1000),
      ])
      const ses = s.data || [], ev = e.data || []
      setStats({
        sessions: ses.length, done: ses.filter(x => x.status === 'completed').length,
        hours: (ses.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 3600).toFixed(1),
        avg: ev.length ? Math.round(ev.reduce((t, x) => t + Number(x.overall_score), 0) / ev.length) : '—',
      })
      setHsk(await allLevelStats(user.id))
    })()
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    const { id, avatar_url, full_name, university, student_code, chinese_level, internship_field } = f
    const { data, error } = await supabase.from('profiles')
      .update({ avatar_url, full_name, university, student_code, chinese_level, internship_field }).eq('id', id).select().single()
    if (error) return setMsg(error.message)
    setProfile(data); setMsg('Đã lưu ✓')
  }
  const pickAvatar = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 256
      const side = Math.min(img.width, img.height)
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256)
      c.toBlob(async (blob) => {
        setPreview(URL.createObjectURL(blob)); setMsg('Đang tải ảnh lên…')
        try {
          const path = await uploadMedia(`avatars/${f.id}/avatar.jpg`, blob)
          setF(prev => ({ ...prev, avatar_url: path })); setMsg('Đã tải ảnh, bấm Lưu để hoàn tất.')
        } catch (err) { setMsg('Không tải được ảnh: ' + err.message) }
      }, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }
  const changePw = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwMsg(error ? error.message : 'Đã đổi mật khẩu ✓'); if (!error) setPw('')
  }
  const field = (k, label) => <label>{label}<input value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>
  const img = preview || stored
  const since = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : ''

  return (
    <>
      <PageHeader zh="我的" title="Hồ sơ cá nhân" crumbs={[[null, 'Hồ sơ']]} sub="Quản lý thông tin, theo dõi tiến độ học và bảo mật tài khoản." />
      <div className="profile-top card scroll-h">
        {img ? <img src={img} alt="" className="avatar lg" /> : <span className="seal big">{(f.full_name || '学')[0]}</span>}
        <div className="pt-info">
          <h2>{f.full_name || 'Học viên'}</h2>
          <p>{f.university || 'Chưa cập nhật trường'} · {f.chinese_level || 'HSK 3'}{f.internship_field ? ` · ${f.internship_field}` : ''}</p>
          <small>{user.email}{since && ` · Tham gia ${since}`}{profile?.role === 'admin' && ' · Quản trị viên'}</small>
        </div>
        {stats && (
          <div className="stats in-card">
            <div><b>{stats.sessions}</b><span>Buổi luyện</span></div>
            <div><b>{stats.done}</b><span>Hoàn thành</span></div>
            <div><b>{stats.hours}h</b><span>Thời gian</span></div>
            <div><b>{stats.avg}</b><span>Điểm TB</span></div>
          </div>
        )}
      </div>

      <div className="profile-cols">
        <section className="panel">
          <h2 className="h2 sm"><span className="zh">进度</span> Tiến độ HSK 1 – 9</h2>
          {!hsk ? <div className="sk" style={{ height: 240 }} /> : hsk.map(h => {
            const pct = h.total ? Math.round(h.learned / h.total * 100) : 0
            return (
              <div className="hsk-row" key={h.level}>
                <b>{h.level}</b>
                <div className="track"><i style={{ width: pct + '%' }} /></div>
                <span>{h.learned}/{h.total} · {pct}%</span>
              </div>
            )
          })}
          <small>Tính theo số từ bạn đã đánh dấu “đã nhớ” hoặc “thuộc”.</small>
        </section>

        <div>
          <form className="panel form" onSubmit={save}>
            <h2 className="h2 sm"><span className="zh">资料</span> Thông tin</h2>
            <div className="avatar-edit">
              {img ? <img src={img} alt="" className="avatar" /> : <span className="seal">{(f.full_name || '学')[0]}</span>}
              <label>Ảnh đại diện<input type="file" accept="image/*" onChange={pickAvatar} /></label>
            </div>
            <div className="fgrid">
              {field('full_name', 'Họ và tên')}{field('university', 'Trường đại học')}
              {field('student_code', 'Mã sinh viên')}{field('internship_field', 'Lĩnh vực thực tập')}
              <label>Trình độ tiếng Trung
                <select value={f.chinese_level || 'HSK 3'} onChange={e => setF({ ...f, chinese_level: e.target.value })}>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n}>{n === 7 ? 'HSK 7-9' : `HSK ${n}`}</option>)}
                </select>
              </label>
            </div>
            {msg && <p className="msg">{msg}</p>}
            <button className="btn">保存 · Lưu</button>
          </form>
          <form className="panel form" onSubmit={changePw} style={{ marginTop: '1.2rem' }}>
            <h2 className="h2 sm"><span className="zh">密码</span> Đổi mật khẩu</h2>
            <label>Mật khẩu mới<input type="password" minLength={6} required value={pw} onChange={e => setPw(e.target.value)} /></label>
            {pwMsg && <p className="msg">{pwMsg}</p>}
            <button className="btn ghost">Đổi mật khẩu</button>
          </form>
        </div>
      </div>
    </>
  )
}
