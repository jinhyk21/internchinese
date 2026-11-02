import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { matchAll } from '../text.js'
import { supabase } from '../supabase'
import { Empty, PageHeader, ScoreBadge, Skeleton } from '../components/ui.jsx'

const ST = { in_progress: ['进行中', 'Đang dở'], completed: ['已完成', 'Hoàn thành'], abandoned: ['已放弃', 'Đã bỏ'] }
const fmt = (s) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, '0')}″`

export default function History() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [st, setSt] = useState('all')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(20)
  useEffect(() => {
    supabase.from('conversation_sessions')
      .select('*, scenarios(title,title_zh), conversation_evaluations(overall_score)')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => setRows(data || []))
  }, [user.id])

  const score = (r) => { const e = r.conversation_evaluations; return (Array.isArray(e) ? e[0] : e)?.overall_score ?? null }
  const sum = useMemo(() => {
    const r = rows || [], sc = r.map(score).filter(x => x != null)
    return {
      n: r.length, done: r.filter(x => x.status === 'completed').length,
      hours: (r.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 3600).toFixed(1),
      best: sc.length ? Math.round(Math.max(...sc)) : '—',
    }
  }, [rows])
  const list = (rows || []).filter(r => (st === 'all' || r.status === st) &&
    (!q.trim() || matchAll([r.scenarios?.title, r.scenarios?.title_zh, ST[r.status]], q)))

  return (
    <>
      <PageHeader zh="记录" title="Lịch sử luyện tập" crumbs={[[null, 'Lịch sử']]} sub="Xem lại mọi buổi luyện, điểm số và nhận xét của AI." />
      <div className="stats">
        <div><b>{sum.n}</b><span>Tổng số buổi</span></div>
        <div><b>{sum.done}</b><span>Hoàn thành</span></div>
        <div><b>{sum.hours}h</b><span>Thời gian luyện</span></div>
        <div><b>{sum.best}</b><span>Điểm cao nhất</span></div>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="搜索 · Tìm theo tên tình huống…" value={q} onChange={e => { setQ(e.target.value); setShown(20) }} />
        <div className="chips inline">
          {[['all', 'Tất cả'], ['completed', '已完成'], ['in_progress', '进行中'], ['abandoned', '已放弃']].map(([k, l]) => (
            <button key={k} className={st === k ? 'chip on' : 'chip'} onClick={() => { setSt(k); setShown(20) }}>{l}</button>
          ))}
        </div>
      </div>
      {!rows ? <Skeleton n={4} h={70} /> : !list.length ? (
        <Empty zh="练" title="Chưa có buổi luyện nào" text="Bắt đầu một tình huống để lịch sử xuất hiện ở đây." to="/" cta="Chọn tình huống" />
      ) : (
        <div className="card tbl"><table className="resp">
          <thead><tr><th>Tình huống</th><th>Trạng thái</th><th>Chế độ</th><th>Thời lượng</th><th>Điểm</th><th>Ngày</th></tr></thead>
          <tbody>{list.slice(0, shown).map(r => (
            <tr key={r.id}>
              <td data-label="Tình huống"><Link to={r.status === 'in_progress' ? `/practice/${r.scenario_id}` : `/history/${r.id}`}>
                <b className="zh">{r.scenarios?.title_zh}</b></Link><small>{r.scenarios?.title}</small></td>
              <td data-label="Trạng thái"><span className={'tag ' + r.status}>{ST[r.status][0]} · {ST[r.status][1]}</span></td>
              <td data-label="Chế độ">{r.communication_mode === 'voice' ? '🎤 Giọng nói' : '⌨ Văn bản'}</td>
              <td data-label="Thời lượng">{fmt(r.duration_seconds)}</td>
              <td data-label="Điểm"><ScoreBadge value={score(r)} /></td>
              <td data-label="Ngày">{new Date(r.created_at).toLocaleString('vi-VN')}</td>
            </tr>))}</tbody>
        </table></div>
      )}
      {shown < list.length && <div className="more"><button className="btn ghost" onClick={() => setShown(shown + 20)}>Xem thêm ({list.length - shown})</button></div>}
    </>
  )
}
