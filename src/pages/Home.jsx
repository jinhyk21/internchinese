import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { matchAll } from '../text.js'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import ScenarioCard from '../components/ScenarioCard.jsx'
import { Empty, PageHeader, Skeleton, LEVEL } from '../components/ui.jsx'

const PAGE = 24

export default function Home() {
  const { user, profile } = useAuth()
  const [cats, setCats] = useState([])
  const [scenarios, setScenarios] = useState(null)
  const [marks, setMarks] = useState(new Set())
  const [sessions, setSessions] = useState([])
  const [avg, setAvg] = useState(null)
  const [words, setWords] = useState(0)
  const [cat, setCat] = useState('all')
  const [diff, setDiff] = useState('all')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const [c, s, b, ses, ev, uv] = await Promise.all([
        supabase.from('categories').select('*').order('display_order'),
        supabase.from('scenarios').select('*').order('created_at'),
        supabase.from('bookmarks').select('scenario_id').eq('item_type', 'scenario').eq('user_id', user.id),
        supabase.from('conversation_sessions').select('id,scenario_id,status,duration_seconds,created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('conversation_evaluations').select('overall_score').eq('user_id', user.id),
        supabase.from('user_vocabulary').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).in('status', ['remembered', 'mastered']),
      ])
      const e = c.error || s.error
      if (e) { setErr(e.message); setScenarios([]); return }
      setCats(c.data); setScenarios(s.data)
      setMarks(new Set((b.data || []).map(x => x.scenario_id)))
      setSessions(ses.data || [])
      const sc = ev.data || []
      setAvg(sc.length ? Math.round(sc.reduce((t, x) => t + Number(x.overall_score), 0) / sc.length) : null)
      setWords(uv.count || 0)
    })()
  }, [user.id])

  const stats = useMemo(() => ({
    done: sessions.filter(x => x.status === 'completed').length,
    mins: Math.round(sessions.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 60),
  }), [sessions])

  const byId = useMemo(() => Object.fromEntries((scenarios || []).map(s => [s.id, s])), [scenarios])
  const catOf = (s) => cats.find(c => c.id === s?.category_id)
  const resume = sessions.filter(x => x.status === 'in_progress' && byId[x.scenario_id]).slice(0, 3)
  const today = useMemo(() => {
    if (!scenarios?.length) return null
    const done = new Set(sessions.map(x => x.scenario_id))
    const pool = scenarios.filter(s => !done.has(s.id))
    const list = pool.length ? pool : scenarios
    const day = Math.floor(Date.now() / 86400000)
    return list[day % list.length]
  }, [scenarios, sessions])

  const list = (scenarios || []).filter(s =>
    (cat === 'all' || s.category_id === cat) && (diff === 'all' || s.difficulty === diff) &&
    (!q.trim() || matchAll([s.title, s.title_zh, s.description, s.ai_role, s.ai_role_zh, s.situation], q)))
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

      {err && <p className="msg">{err}</p>}

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

      <h2 className="h2"><span className="zh">全部情景</span> Tất cả tình huống <small className="count">{list.length}</small></h2>
      <div className="toolbar">
        <input className="search" placeholder="搜索 · Tìm tình huống…" value={q} onChange={e => { setQ(e.target.value); setShown(PAGE) }} />
        <div className="chips inline">
          {[['all', 'Mọi độ khó'], ['beginner', '初级'], ['intermediate', '中级'], ['advanced', '高级']].map(([k, l]) => (
            <button key={k} className={diff === k ? 'chip on' : 'chip'} onClick={() => { setDiff(k); setShown(PAGE) }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="chips">
        <button className={cat === 'all' ? 'chip on' : 'chip'} onClick={() => { setCat('all'); setShown(PAGE) }}>全部 · Tất cả</button>
        {cats.map(c => (
          <button key={c.id} className={cat === c.id ? 'chip on' : 'chip'} onClick={() => { setCat(c.id); setShown(PAGE) }}>
            <span className="zh">{c.name_zh}</span> · {c.name}
          </button>
        ))}
      </div>

      {!scenarios ? <Skeleton /> : !list.length ? (
        <Empty zh="空" title="Không tìm thấy tình huống" text="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <>
          <div className="grid">
            {list.slice(0, shown).map(s => <ScenarioCard key={s.id} s={s} cat={catOf(s)} marked={marks.has(s.id)} />)}
          </div>
          {shown < list.length && (
            <div className="more"><button className="btn ghost" onClick={() => setShown(shown + PAGE)}>Xem thêm ({list.length - shown})</button></div>
          )}
        </>
      )}
    </>
  )
}
