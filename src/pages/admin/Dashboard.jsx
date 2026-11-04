import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { AreaChart, Columns, Donut, HBars, Head, Heat, Kpi, Loading, Panel, Radar, Tag } from './ui.jsx'
import { DAY, avg, countOf, dayStart, fmtNum, fmtTime, nameOf, pageAll, scoreCls } from './lib.js'

const AXES = [['pronunciation_score', 'Phát âm'], ['grammar_score', 'Ngữ pháp'], ['vocabulary_score', 'Từ vựng'], ['fluency_score', 'Trôi chảy'], ['communication_score', 'Giao tiếp']]
const pct = (a, b) => b ? Math.round((a - b) / b * 100) : (a ? 100 : 0)

export default function Dashboard() {
  const [raw, setRaw] = useState(null)
  const [range, setRange] = useState(30)

  useEffect(() => {
    (async () => {
      // Chỉ tải 180 ngày gần nhất cho bảng hoạt động (đủ cho kỳ 90 ngày + kỳ so sánh), song song + cache 60s
      const since = new Date(dayStart(Date.now() - 180 * DAY)).toISOString()
      const T = 60000
      const [u, s, e, x, sc, ca, voc, bm, uv] = await Promise.all([
        pageAll('profiles', '*', { ttl: T }),
        pageAll('conversation_sessions', 'id,user_id,scenario_id,created_at,status,duration_seconds,communication_mode', { since, ttl: T }),
        pageAll('conversation_evaluations', 'user_id,session_id,overall_score,pronunciation_score,grammar_score,vocabulary_score,fluency_score,communication_score,created_at', { since, ttl: T }),
        pageAll('exam_results', 'user_id,track,score,created_at,duration_seconds', { since, ttl: T }),
        supabase.from('scenarios').select('id,title,title_zh,difficulty,is_published,category_id'),
        supabase.from('categories').select('id,name'),
        countOf('vocabulary'), countOf('bookmarks'), countOf('user_vocabulary'),
      ])
      setRaw({ users: u.data, ses: s.data, ev: e.data, ex: x.data, sc: sc.data || [], cat: ca.data || [], voc, bm, uv })
    })()
  }, [])

  const d = useMemo(() => {
    if (!raw) return null
    const now = Date.now(), from = dayStart(now - (range - 1) * DAY), prevFrom = from - range * DAY
    const inR = (t) => new Date(t).getTime() >= from
    const inP = (t) => { const v = new Date(t).getTime(); return v >= prevFrom && v < from }
    const days = [...Array(range)].map((_, i) => from + i * DAY)
    const bucket = (list, key = 'created_at') => {
      const c = days.map(() => 0)
      list.forEach(r => { const i = Math.floor((dayStart(r[key]) - from) / DAY); if (i >= 0 && i < range) c[i]++ })
      return c
    }
    const { users, ses, ev, ex, sc, cat } = raw
    const sesR = ses.filter(x => inR(x.created_at)), sesP = ses.filter(x => inP(x.created_at))
    const usersR = users.filter(x => inR(x.created_at)), usersP = users.filter(x => inP(x.created_at))
    const evR = ev.filter(x => inR(x.created_at)), evP = ev.filter(x => inP(x.created_at))
    const exR = ex.filter(x => inR(x.created_at)), exP = ex.filter(x => inP(x.created_at))
    const active = new Set(sesR.map(x => x.user_id)), activeP = new Set(sesP.map(x => x.user_id))
    const byId = Object.fromEntries(users.map(u => [u.id, u]))
    const scById = Object.fromEntries(sc.map(s => [s.id, s]))
    const catById = Object.fromEntries(cat.map(c => [c.id, c.name]))
    const count = (list, f) => list.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m }, {})
    const top = (m, n = 6) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)
    const hist = [...Array(10)].map((_, i) => ({ label: `${i * 10}`, value: 0, color: i < 6 ? 'var(--rd)' : i < 8 ? 'var(--am)' : 'var(--gn)' }))
    evR.forEach(x => hist[Math.min(9, Math.floor(Number(x.overall_score) / 10))].value++)
    const heat = [...Array(7)].map(() => [...Array(24)].map(() => 0))
    sesR.forEach(x => { const t = new Date(x.created_at); heat[(t.getDay() + 6) % 7][t.getHours()]++ })
    const perUser = {}
    ses.forEach(x => { (perUser[x.user_id] ||= { n: 0, sc: [] }).n++ })
    ev.forEach(x => { (perUser[x.user_id] ||= { n: 0, sc: [] }).sc.push(Number(x.overall_score)) })
    const board = Object.entries(perUser).map(([id, v]) => ({ id, n: v.n, avg: v.sc.length ? v.sc.reduce((a, b) => a + b, 0) / v.sc.length : 0 }))
      .filter(x => x.n >= 1).sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 6)
    const tracks = Object.entries(ex.reduce((m, x) => { (m[x.track] ||= []).push(Number(x.score)); return m }, {}))
      .map(([t, l]) => ({ t, n: l.length, a: avg(l) })).sort((a, b) => b.n - a.n).slice(0, 6)
    return {
      labels: days.map(t => { const x = new Date(t); return `${x.getDate()}/${x.getMonth() + 1}` }),
      newUsers: bucket(usersR), sesDay: bucket(sesR), exDay: bucket(exR),
      kpi: {
        users: users.length, newU: usersR.length, dU: pct(usersR.length, usersP.length),
        active: active.size, dA: pct(active.size, activeP.size),
        ses: sesR.length, dS: pct(sesR.length, sesP.length),
        done: Math.round(sesR.filter(x => x.status === 'completed').length / Math.max(1, sesR.length) * 100),
        score: Math.round(avg(evR, x => x.overall_score)), dSc: Math.round(avg(evR, x => x.overall_score) - avg(evP, x => x.overall_score)),
        hours: Math.round(sesR.reduce((t, x) => t + (x.duration_seconds || 0), 0) / 360) / 10,
        exams: exR.length, dE: pct(exR.length, exP.length), exScore: Math.round(avg(exR, x => x.score)),
      },
      hist, heat,
      radar: AXES.map(([k, label]) => ({ label, value: avg(evR, x => x[k]) })),
      mode: Object.entries(count(sesR, x => x.communication_mode || 'text')).map(([k, v]) => ({ label: k === 'voice' ? 'Giọng nói' : 'Văn bản', value: v })),
      status: Object.entries(count(sesR, x => x.status || '—')).map(([k, v]) => ({ label: { completed: 'Hoàn thành', in_progress: 'Đang làm', abandoned: 'Bỏ dở' }[k] || k, value: v })),
      roles: Object.entries(count(users, x => x.role === 'admin' ? 'Quản trị' : 'Học viên')).map(([label, value]) => ({ label, value })),
      levels: top(count(users, x => x.chinese_level || 'Chưa chọn'), 5).map(([label, value]) => ({ label, value })),
      topSc: top(count(sesR, x => x.scenario_id)).map(([id, v]) => ({ label: scById[id]?.title || '—', value: v })),
      topCat: top(count(sesR, x => catById[scById[x.scenario_id]?.category_id] || 'Khác'), 5).map(([label, value]) => ({ label, value })),
      board: board.map(b => ({ ...b, name: nameOf(byId[b.id]) })),
      tracks,
      recent: [...ses].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8).map(x => ({ ...x, name: nameOf(byId[x.user_id]), sc: scById[x.scenario_id]?.title })),
      content: { sc: sc.length, pub: sc.filter(s => s.is_published).length, cat: cat.length },
    }
  }, [raw, range])

  if (!d) return <Loading />
  const k = d.kpi
  return (
    <>
      <Head title="Dashboard" sub={`Thống kê chi tiết ${range} ngày gần nhất · so sánh với ${range} ngày trước đó`}>
        <div className="a-seg">{[7, 30, 90].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r} ngày</button>)}</div>
      </Head>
      <div className="a-grid g-kpi">
        <Kpi label="Học viên" value={fmtNum(k.users)} sub={`+${k.newU} mới`} delta={k.dU} spark={d.newUsers} />
        <Kpi tone="violet" label="Đang hoạt động" value={fmtNum(k.active)} sub="có luyện tập" delta={k.dA} spark={d.sesDay} />
        <Kpi tone="pink" label="Buổi luyện tập" value={fmtNum(k.ses)} sub={`${k.done}% hoàn thành`} delta={k.dS} spark={d.sesDay} />
        <Kpi tone="green" label="Điểm trung bình" value={k.score || '—'} sub="mỗi buổi chấm" delta={k.dSc} />
        <Kpi tone="amber" label="Giờ luyện" value={`${k.hours}h`} sub="tổng thời lượng" />
        <Kpi label="Lượt thi thử" value={fmtNum(k.exams)} sub={`TB ${k.exScore || '—'} điểm`} delta={k.dE} spark={d.exDay} />
      </div>

      <div className="a-grid g-main">
        <Panel title="Hoạt động theo ngày" hint="Học viên mới · buổi luyện · lượt thi">
          <AreaChart labels={d.labels} series={[{ name: 'Buổi luyện', data: d.sesDay }, { name: 'Học viên mới', data: d.newUsers }, { name: 'Lượt thi', data: d.exDay }]} />
        </Panel>
        <Panel title="Năng lực trung bình" hint="5 tiêu chí chấm điểm"><Radar axes={d.radar} /></Panel>
      </div>

      <div className="a-grid g3">
        <Panel title="Phân bố điểm" hint="số buổi theo mốc điểm"><Columns items={d.hist} /></Panel>
        <Panel title="Hình thức luyện"><Donut items={d.mode} /></Panel>
        <Panel title="Trạng thái buổi luyện"><Donut items={d.status} /></Panel>
      </div>

      <div className="a-grid g2">
        <Panel title="Giờ cao điểm" hint="thứ × giờ trong ngày"><Heat grid={d.heat} rows={['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']} cols={[...Array(24)].map((_, i) => i % 3 === 0 ? i : '')} /></Panel>
        <Panel title="Tình huống được luyện nhiều nhất"><HBars items={d.topSc} unit=" lượt" /></Panel>
      </div>

      <div className="a-grid g3">
        <Panel title="Ngành được quan tâm"><HBars items={d.topCat} unit=" lượt" /></Panel>
        <Panel title="Trình độ học viên"><HBars items={d.levels} /></Panel>
        <Panel title="Vai trò tài khoản"><Donut items={d.roles} /></Panel>
      </div>

      <div className="a-grid g2">
        <Panel title="Bảng xếp hạng học viên" hint="theo số buổi luyện · 180 ngày">
          <div className="a-table"><table><thead><tr><th>#</th><th>Học viên</th><th className="r">Buổi</th><th className="r">Điểm TB</th></tr></thead>
            <tbody>{d.board.map((b, i) => <tr key={b.id}><td>{i + 1}</td><td>{b.name}</td><td className="r">{b.n}</td><td className="r">{b.avg ? <Tag kind={scoreCls(b.avg)}>{Math.round(b.avg)}</Tag> : '—'}</td></tr>)}</tbody></table></div>
        </Panel>
        <Panel title="Thi thử theo bài" hint="180 ngày gần nhất">
          <div className="a-table"><table><thead><tr><th>Bài thi</th><th className="r">Lượt</th><th className="r">Điểm TB</th></tr></thead>
            <tbody>{d.tracks.map(t => <tr key={t.t}><td>{t.t.startsWith('cat:') ? 'Theo ngành' : t.t}</td><td className="r">{t.n}</td><td className="r"><Tag kind={scoreCls(t.a)}>{Math.round(t.a)}</Tag></td></tr>)}
              {!d.tracks.length && <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--mut)' }}>Chưa có lượt thi</td></tr>}</tbody></table></div>
        </Panel>
      </div>

      <div className="a-grid g2">
        <Panel title="Hoạt động mới nhất">
          <ul className="a-feed">{d.recent.map(r => <li key={r.id}><span className="dot" /><div><b>{r.name}</b> luyện “{r.sc || '—'}”<small>{fmtTime(r.created_at)} · {r.status}</small></div></li>)}</ul>
        </Panel>
        <Panel title="Kho nội dung">
          <div className="a-kv">
            <div><small>Ngành</small><b>{d.content.cat}</b></div>
            <div><small>Tình huống</small><b>{d.content.sc} <Tag kind="green">{d.content.pub} xuất bản</Tag></b></div>
            <div><small>Từ vựng</small><b>{fmtNum(raw.voc)}</b></div>
            <div><small>Mục đã lưu</small><b>{fmtNum(raw.bm)}</b></div>
            <div><small>Từ đang học</small><b>{fmtNum(raw.uv)}</b></div>
          </div>
        </Panel>
      </div>
    </>
  )
}
