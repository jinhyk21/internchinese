import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { PageHeader, Skeleton, scoreClass } from '../components/ui.jsx'

const AXES = [['pronunciation_score', '发音', 'Phát âm'], ['grammar_score', '语法', 'Ngữ pháp'], ['vocabulary_score', '词汇', 'Từ vựng'],
  ['fluency_score', '流利', 'Trôi chảy'], ['communication_score', '沟通', 'Giao tiếp']]

function Radar({ ev, avg }) {
  const R = 92, C = 130, n = AXES.length
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [C + Math.cos(a) * R * v / 100, C + Math.sin(a) * R * v / 100] }
  const poly = (f) => AXES.map(([k], i) => pt(i, f(k)).join(',')).join(' ')
  return (
    <svg viewBox="0 0 260 260" className="radar" role="img" aria-label="Biểu đồ radar">
      {[25, 50, 75, 100].map(g => <polygon key={g} points={AXES.map((_, i) => pt(i, g).join(',')).join(' ')} className="rg" />)}
      {AXES.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, 100)[0]} y2={pt(i, 100)[1]} className="rg" />)}
      {avg && <polygon points={poly(k => avg[k] ?? 0)} className="ra" />}
      <polygon points={poly(k => ev[k] ?? 0)} className="rv" />
      {AXES.map(([, zh], i) => { const [x, y] = pt(i, 122); return <text key={zh} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="rl">{zh}</text> })}
    </svg>
  )
}

export default function Result() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [ev, setEv] = useState(undefined)
  const [msgs, setMsgs] = useState([])
  const [sc, setSc] = useState(null)
  const [avg, setAvg] = useState(null)

  useEffect(() => {
    (async () => {
      const [e, m, s, all] = await Promise.all([
        supabase.from('conversation_evaluations').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('conversation_messages').select('*').eq('session_id', sessionId).order('created_at'),
        supabase.from('conversation_sessions').select('*, scenarios(title,title_zh,id)').eq('id', sessionId).maybeSingle(),
        supabase.from('conversation_evaluations').select('*').eq('user_id', user.id).neq('session_id', sessionId).limit(500),
      ])
      setEv(e.data || null); setMsgs(m.data || []); setSc(s.data)
      const l = all.data || []
      if (l.length) {
        const a = { n: l.length }
        ;['overall_score', ...AXES.map(x => x[0])].forEach(k => { a[k] = l.reduce((t, x) => t + Number(x[k] || 0), 0) / l.length })
        setAvg(a)
      }
    })()
  }, [sessionId, user.id])

  const title = sc?.scenarios?.title_zh || '评价'
  return (
    <>
      <PageHeader zh="评价" title={`Kết quả · ${sc?.scenarios?.title || 'Đánh giá buổi luyện'}`} crumbs={[['/history', 'Lịch sử'], [null, 'Kết quả']]}
        sub={sc ? `${title} · ${new Date(sc.created_at).toLocaleString('vi-VN')}` : undefined}>
        {sc?.scenarios?.id && <Link className="btn gold" to={`/practice/${sc.scenarios.id}`}>Luyện lại</Link>}
      </PageHeader>
      {ev === undefined ? <Skeleton n={3} h={260} /> : !ev ? (
        <div className="empty"><span className="seal big">空</span><h3>Buổi này chưa có đánh giá</h3><Link className="btn" to="/history">Quay lại lịch sử</Link></div>
      ) : (
        <>
          <div className="result">
            <div className="card total">
              <div className={'ring ' + scoreClass(ev.overall_score)} style={{ '--p': ev.overall_score }}><b className="hanzi">{Math.round(ev.overall_score)}</b></div>
              <h4>Điểm tổng</h4>
              {avg && <p className={'delta ' + (ev.overall_score >= avg.overall_score ? 'up' : 'down')}>
                {ev.overall_score >= avg.overall_score ? '▲' : '▼'} {Math.abs(Math.round(ev.overall_score - avg.overall_score))} so với trung bình {Math.round(avg.overall_score)} ({avg.n} buổi trước)</p>}
              {ev.detailed_feedback?.summary && <p>{ev.detailed_feedback.summary}</p>}
            </div>
            <div className="card">
              <h4>能力雷达 · Radar kỹ năng</h4>
              <Radar ev={ev} avg={avg} />
              <p className="legend"><i className="lv" /> Buổi này {avg && <><i className="la" /> Trung bình của bạn</>}</p>
            </div>
            <div className="card">
              <h4>分项得分 · Điểm chi tiết</h4>
              {AXES.map(([k, zh, vi]) => (
                <div className="bar" key={k}><span><b className="zh">{zh}</b> {vi}</span>
                  <div><i style={{ width: `${ev[k] ?? 0}%` }} />{avg && <u style={{ left: `${avg[k]}%` }} />}</div><b>{Math.round(ev[k] ?? 0)}</b></div>
              ))}
              {avg && <small>Vạch vàng = điểm trung bình của bạn.</small>}
            </div>
          </div>
          <div className="result r2">
            <div className="card ok"><h4>优点 · Điểm mạnh</h4><ul>{(ev.strengths || []).map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className="card warn"><h4>不足 · Cần cải thiện</h4><ul>{(ev.weaknesses || []).map(x => <li key={x}>{x}</li>)}</ul></div>
            <div className="card"><h4>建议 · Đề xuất</h4><ul>{(ev.recommendations || []).map(x => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <div className="card" style={{ marginTop: '1.2rem' }}><h4>纠错 · Sửa lỗi</h4>
            {(ev.corrections || []).map((c, i) => (
              <div className="corr" key={i}><del className="zh">{c.original}</del> → <b className="zh">{c.corrected}</b><small>{c.explanation}</small></div>
            ))}
            {!(ev.corrections || []).length && <p>Không có lỗi cần sửa 👍</p>}</div>
        </>
      )}
      <h2 className="h2" style={{ marginTop: '1.6rem' }}><span className="zh">对话</span> Hội thoại</h2>
      <div className="card transcript">{msgs.map(m => (
        <div key={m.id} className={'bubble ' + m.sender}><span className="zh">{m.content}</span>
          {m.pinyin && <small>{m.pinyin}</small>}{m.translated_content && <small>{m.translated_content}</small>}</div>
      ))}{!msgs.length && <p>Không có tin nhắn.</p>}</div>
    </>
  )
}
