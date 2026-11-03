import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { Pager, PageHeader, ScoreBadge } from '../components/ui.jsx'
import { TRACKS, examCount, examSize, loadResults } from '../exam.js'

const PER = 24

export default function Exams() {
  const { user } = useAuth()
  const [track, setTrack] = useState(() => localStorage.getItem('ic_exam_track') || 'HSK 1')
  const [cats, setCats] = useState([])
  const [res, setRes] = useState({})
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')       // all | todo | done

  useEffect(() => { supabase.from('categories').select('id,name,name_zh').order('display_order').then(({ data }) => setCats(data || [])) }, [])
  useEffect(() => { localStorage.setItem('ic_exam_track', track); setPage(1); setRes({}); loadResults(user.id, track).then(setRes) }, [track, user.id])

  const industry = track.startsWith('cat:')
  const total = examCount(track)
  const all = useMemo(() => [...Array(total)].map((_, i) => i + 1), [total])
  const nums = useMemo(() => all.filter(n => filter === 'all' || (filter === 'done') === !!res[n]), [all, filter, res])
  const pages = Math.max(1, Math.ceil(nums.length / PER))
  const shown = nums.slice((page - 1) * PER, page * PER)
  const done = Object.keys(res).length
  const avg = done ? Math.round(Object.values(res).reduce((t, x) => t + x.best, 0) / done) : null
  const title = industry ? (cats.find(c => 'cat:' + c.id === track)?.name || 'Theo ngành') : track
  const random = () => {
    const todo = all.filter(n => !res[n]); const pool = todo.length ? todo : all
    return pool[Math.floor(Math.random() * pool.length)]
  }

  return (
    <>
      <PageHeader zh="考试" title="Thi thử HSK & theo ngành" crumbs={[[null, 'Thi thử']]}
        sub="Mỗi cấp HSK có hàng trăm đề thi thử khác nhau (HSK 7-9 nhiều gấp 3), mỗi ngành cũng có 100 đề. Đề gồm chọn nghĩa, phiên âm, nghe, điền từ.">
        <Link className="btn gold" to={`/exams/${encodeURIComponent(track)}/${random()}`}>随机 · Đề ngẫu nhiên</Link>
      </PageHeader>

      <div className="chips levels">
        {TRACKS.map(l => <button key={l} className={track === l ? 'chip on' : 'chip'} onClick={() => setTrack(l)}>{l}</button>)}
        <button className={industry ? 'chip on' : 'chip'} onClick={() => !industry && cats[0] && setTrack('cat:' + cats[0].id)}>行业 · Theo ngành</button>
      </div>
      {industry && (
        <div className="toolbar">
          <select className="sel" value={track} onChange={e => setTrack(e.target.value)}>
            {cats.map(c => <option key={c.id} value={'cat:' + c.id}>{c.name_zh} · {c.name}</option>)}
          </select>
        </div>
      )}

      <div className="stats">
        <div><b>{total}</b><span>Đề thi {title}</span></div>
        <div><b>{examSize(track)}</b><span>Câu mỗi đề</span></div>
        <div><b>{done}/{total}</b><span>Đã làm</span></div>
        <div><b>{avg ?? '—'}</b><span>Điểm tốt nhất TB</span></div>
      </div>

      <div className="toolbar">
        <div className="seg2">
          {[['all', 'Tất cả'], ['todo', 'Chưa làm'], ['done', 'Đã làm']].map(([k, l]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => { setFilter(k); setPage(1) }}>{l}</button>))}
        </div>
        <span className="resultinfo">{nums.length} đề · trang {page}/{pages}</span>
      </div>

      <div className="grid examgrid">
        {shown.map(n => {
          const r = res[n]
          return (
            <Link key={n} className={'card exam' + (r ? ' done' : '')} to={`/exams/${encodeURIComponent(track)}/${n}`}>
              <span className="seal sm2">{n}</span>
              <div><b>Đề số {n}</b><small>{examSize(track)} câu · {title}</small></div>
              <div className="exam-r">{r ? <><ScoreBadge value={r.best} /><small>{r.count} lần</small></> : <small>Chưa làm</small>}</div>
            </Link>
          )
        })}
      </div>
      <Pager page={page} pages={pages} onChange={setPage} />
    </>
  )
}
