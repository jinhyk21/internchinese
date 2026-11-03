import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { matchAll } from '../text.js'
import { supabase } from '../supabase'
import { Empty, PageHeader, Pager, ScoreBadge, Skeleton } from '../components/ui.jsx'

const ST = { in_progress: ['进行中', 'Đang dở'], completed: ['已完成', 'Hoàn thành'], abandoned: ['已放弃', 'Đã bỏ'] }
const fmt = (s) => `${Math.floor(s / 60)}′${String(s % 60).padStart(2, '0')}″`

const SIZE = 15

export default function History() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [count, setCount] = useState(0)
  const [sum, setSum] = useState({ n: 0, done: 0, hours: '0.0', best: '—' })
  const [scAll, setScAll] = useState(null)       // danh sách tình huống rút gọn (tìm không dấu theo tên)
  const [st, setSt] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // Thống kê tổng: chỉ lấy vài cột nhẹ, không kéo cả bảng
  useEffect(() => {
    (async () => {
      const [s, e, sc] = await Promise.all([
        supabase.from('conversation_sessions').select('status,duration_seconds').eq('user_id', user.id).limit(2000),
        supabase.from('conversation_evaluations').select('overall_score').eq('user_id', user.id).order('overall_score', { ascending: false }).limit(1),
        supabase.from('scenarios').select('id,title,title_zh'),
      ])
      const r = s.data || []
      setSum({
        n: r.length, done: r.filter(x => x.status === 'completed').length,
        hours: (r.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 3600).toFixed(1),
        best: e.data?.[0] ? Math.round(e.data[0].overall_score) : '—',
      })
      setScAll(sc.data || [])
    })()
  }, [user.id])

  // Danh sách: lọc + phân trang ở server (15 dòng/trang)
  useEffect(() => {
    if (!scAll) return
    let on = true
    setRows(null)
    ;(async () => {
      let qy = supabase.from('conversation_sessions')
        .select('*, scenarios(title,title_zh), conversation_evaluations(overall_score)', { count: 'exact' })
        .eq('user_id', user.id)
      if (st !== 'all') qy = qy.eq('status', st)
      if (q.trim()) {
        const ids = scAll.filter(s => matchAll([s.title, s.title_zh], q)).map(s => s.id)
        qy = qy.in('scenario_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      }
      const { data, count: c } = await qy.order('created_at', { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1)
      if (!on) return
      setRows(data || []); setCount(c || 0)
    })()
    return () => { on = false }
  }, [user.id, st, q, page, scAll])

  const score = (r) => { const e = r.conversation_evaluations; return (Array.isArray(e) ? e[0] : e)?.overall_score ?? null }
  const list = rows || []
  const pages = Math.max(1, Math.ceil(count / SIZE))

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
        <input className="search" placeholder="搜索 · Tìm theo tên tình huống…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
        <div className="chips inline">
          {[['all', 'Tất cả'], ['completed', '已完成'], ['in_progress', '进行中'], ['abandoned', '已放弃']].map(([k, l]) => (
            <button key={k} className={st === k ? 'chip on' : 'chip'} onClick={() => { setSt(k); setPage(1) }}>{l}</button>
          ))}
        </div>
      </div>
      {!rows ? <Skeleton n={4} h={70} /> : !list.length ? (
        <Empty zh="练" title="Chưa có buổi luyện nào" text="Bắt đầu một tình huống để lịch sử xuất hiện ở đây." to="/" cta="Chọn tình huống" />
      ) : (
        <div className="card tbl"><table className="resp">
          <thead><tr><th>Tình huống</th><th>Trạng thái</th><th>Chế độ</th><th>Thời lượng</th><th>Điểm</th><th>Ngày</th></tr></thead>
          <tbody>{list.map(r => (
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
      <Pager page={page} pages={pages} onChange={setPage} />
    </>
  )
}
