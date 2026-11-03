import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { norm } from '../text.js'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { useInfinite } from '../paged.js'
import ScenarioCard from '../components/ScenarioCard.jsx'
import { Empty, MoreSentinel, Skeleton, LEVEL } from '../components/ui.jsx'

const PAGE = 12
const clean = (x) => x.replace(/[,()%*\\]/g, ' ').trim()

export default function Home() {
  const { user, profile } = useAuth()
  const [cats, setCats] = useState([])
  const [marks, setMarks] = useState(new Set())
  const [sessions, setSessions] = useState([])
  const [resumeSc, setResumeSc] = useState({})
  const [today, setToday] = useState(null)
  const [avg, setAvg] = useState(null)
  const [words, setWords] = useState(0)
  const [cat, setCat] = useState('all')
  const [diff, setDiff] = useState('all')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const noCol = useRef(false)

  useEffect(() => { const t = setTimeout(() => setQd(clean(q)), 300); return () => clearTimeout(t) }, [q])

  useEffect(() => {
    (async () => {
      const [c, b, ses, ev, uv, tot] = await Promise.all([
        supabase.from('categories').select('*').order('display_order'),
        supabase.from('bookmarks').select('scenario_id').eq('item_type', 'scenario').eq('user_id', user.id).limit(1000),
        supabase.from('conversation_sessions').select('id,scenario_id,status,duration_seconds,created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
        supabase.from('conversation_evaluations').select('overall_score').eq('user_id', user.id).limit(1000),
        supabase.from('user_vocabulary').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).in('status', ['remembered', 'mastered']),
        supabase.from('scenarios').select('id', { count: 'exact', head: true }),
      ])
      setCats(c.data || [])
      setMarks(new Set((b.data || []).map(x => x.scenario_id)))
      const list = ses.data || []
      setSessions(list)
      const sc = ev.data || []
      setAvg(sc.length ? Math.round(sc.reduce((t, x) => t + Number(x.overall_score), 0) / sc.length) : null)
      setWords(uv.count || 0)
      // chỉ tải đúng vài tình huống cần cho "Tiếp tục" và "Gợi ý hôm nay"
      const ids = [...new Set(list.filter(x => x.status === 'in_progress').map(x => x.scenario_id))].slice(0, 3)
      if (ids.length) {
        const { data } = await supabase.from('scenarios').select('*').in('id', ids)
        setResumeSc(Object.fromEntries((data || []).map(s => [s.id, s])))
      }
      const n = tot.count || 0
      if (n) {
        const { data } = await supabase.from('scenarios').select('*').order('created_at').order('id')
          .range(Math.floor(Date.now() / 86400000) % n, Math.floor(Date.now() / 86400000) % n)
        setToday(data?.[0] || null)
      }
    })()
  }, [user.id])

  const stats = useMemo(() => ({
    done: sessions.filter(x => x.status === 'completed').length,
    mins: Math.round(sessions.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 60),
  }), [sessions])
  const catOf = (s) => cats.find(c => c.id === s?.category_id)
  const resume = sessions.filter(x => x.status === 'in_progress' && resumeSc[x.scenario_id]).slice(0, 3)
  const byId = resumeSc

  // Danh sách tình huống: lọc/tìm ở server, cuộn tới đâu tải tới đó (12 mục/lần)
  const fetchPage = async (from, to) => {
    const build = (useCol) => {
      let qy = supabase.from('scenarios').select('*', { count: 'exact' })
      if (cat !== 'all') qy = qy.eq('category_id', cat)
      if (diff !== 'all') qy = qy.eq('difficulty', diff)
      if (qd) qy = useCol ? qy.ilike('search_text', `%${norm(qd)}%`)
        : qy.or(`title.ilike.%${qd}%,title_zh.ilike.%${qd}%,description.ilike.%${qd}%,ai_role.ilike.%${qd}%,ai_role_zh.ilike.%${qd}%`)
      return qy.order('created_at').order('id').range(from, to)
    }
    let r = await build(!noCol.current)
    if (r.error && /search_text/.test(r.error.message)) { noCol.current = true; r = await build(false) }
    return r
  }
  const list = useInfinite(fetchPage, [cat, diff, qd], PAGE)
  const hour = new Date().getHours()
  const greet = hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <>
      <section className="hero" data-zh="实习">
        <div>
          <p className="zh hello">{greet}，{profile?.full_name || 'bạn'}！</p>
          <h1><span className="zh">职场情景</span> Luyện giao tiếp nơi công sở</h1>
          <p>Chọn một tình huống thực tập, trò chuyện cùng AI và nhận chấm điểm ngay sau mỗi buổi.</p>
        </div>
        <div className="stats in-hero">
          <div><b>{stats.done}</b><span>Buổi hoàn thành</span></div>
          <div><b>{stats.mins}′</b><span>Phút luyện tập</span></div>
          <div><b>{avg ?? '—'}</b><span>Điểm trung bình</span></div>
          <div><b>{words}</b><span>Từ đã nhớ</span></div>
        </div>
      </section>

      {list.error && <p className="msg">{list.error}</p>}

      {(resume.length > 0 || today) && (
        <div className="duo">
          {resume.length > 0 && (
            <section className="panel">
              <h2 className="h2 sm"><span className="zh">继续</span> Tiếp tục luyện tập</h2>
              {resume.map(r => (
                <Link key={r.id} to={`/practice/${r.scenario_id}`} className="resume">
                  <span className="seal sm2">练</span>
                  <div><b className="zh">{byId[r.scenario_id].title_zh}</b><small>{byId[r.scenario_id].title} · bắt đầu {new Date(r.created_at).toLocaleDateString('vi-VN')}</small></div>
                  <em>Tiếp tục ›</em>
                </Link>
              ))}
            </section>
          )}
          {today && (
            <section className="panel today">
              <h2 className="h2 sm"><span className="zh">今日</span> Gợi ý hôm nay</h2>
              <h3 className="zh">{today.title_zh}</h3>
              <h4>{today.title}</h4>
              <p>{today.description}</p>
              <div className="meta"><span className={'tag ' + today.difficulty}>{LEVEL[today.difficulty]}</span><span>⏱ {today.estimated_minutes}′</span></div>
              <Link className="btn" to={`/practice/${today.id}`}>开始 · Thử ngay</Link>
            </section>
          )}
        </div>
      )}

      <h2 className="h2"><span className="zh">全部情景</span> Tất cả tình huống <small className="count">{list.items ? list.count : '…'}</small></h2>
      <div className="toolbar">
        <input className="search" placeholder="搜索 · Tìm tình huống…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="chips inline">
          {[['all', 'Mọi độ khó'], ['beginner', '初级'], ['intermediate', '中级'], ['advanced', '高级']].map(([k, l]) => (
            <button key={k} className={diff === k ? 'chip on' : 'chip'} onClick={() => setDiff(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="chips">
        <button className={cat === 'all' ? 'chip on' : 'chip'} onClick={() => setCat('all')}>全部 · Tất cả</button>
        {cats.map(c => (
          <button key={c.id} className={cat === c.id ? 'chip on' : 'chip'} onClick={() => setCat(c.id)}>
            <span className="zh">{c.name_zh}</span> · {c.name}
          </button>
        ))}
      </div>

      {!list.items ? <Skeleton /> : !list.items.length ? (
        <Empty zh="空" title="Không tìm thấy tình huống" text="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <>
          <div className="grid">
            {list.items.map(s => <ScenarioCard key={s.id} s={s} cat={catOf(s)} marked={marks.has(s.id)} />)}
          </div>
          <MoreSentinel sentinel={list.sentinel} done={list.done} shown={list.items.length} count={list.count} />
        </>
      )}
    </>
  )
}
