import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'
import { Empty, PageHeader, Skeleton } from '../components/ui.jsx'
import { PASS, buildExam, examCount, fetchPool, saveResult, typeLabel } from '../exam.js'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function ExamTake() {
  const { track, no } = useParams()
  const n = Number(no)
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [pool, setPool] = useState(null)
  const [err, setErr] = useState('')
  const [cur, setCur] = useState(0)
  const [ans, setAns] = useState({})
  const [result, setResult] = useState(null)
  const [sec, setSec] = useState(0)
  const [saved, setSaved] = useState(false)
  const t0 = useRef(Date.now())

  useEffect(() => {
    setPool(null); setErr(''); setCur(0); setAns({}); setResult(null); setSaved(false); t0.current = Date.now()
    fetchPool(track).then(setPool).catch(e => { setErr(e.message); toast('Không tải được đề thi: ' + e.message, 'err') })
  }, [track, no])
  useEffect(() => {
    if (result) return
    const t = setInterval(() => setSec(Math.floor((Date.now() - t0.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [result, no])

  const qs = useMemo(() => (pool && pool.length >= 4 ? buildExam(pool, track, n) : []), [pool, track, n])
  const q = qs[cur]
  useEffect(() => { if (q?.type === 'listen' && !result) speak(q.speak) }, [q, result])

  const total = examCount(track)
  const back = <Link className="btn ghost sm" to="/exams">‹ Danh sách đề</Link>
  if (err) return <p className="msg">{err}</p>
  if (!Number.isInteger(n) || n < 1 || n > total) return <Empty zh="空" title="Không có đề này" to="/exams" cta="Về danh sách đề" />
  if (!pool) return <Skeleton n={2} h={260} />
  if (!qs.length) return <Empty zh="空" title="Chưa đủ từ vựng để ra đề" text="Mục này cần ít nhất 4 từ." to="/exams" cta="Về danh sách đề" />

  const answered = Object.keys(ans).length
  const submit = async () => {
    const correct = qs.filter(x => ans[x.id] === x.answer).length
    const score = Math.round(correct / qs.length * 100), duration = Math.round((Date.now() - t0.current) / 1000)
    setResult({ correct, score, duration })
    window.scrollTo({ top: 0 })
    try { await saveResult(user.id, { track, exam_no: n, score, correct, total: qs.length, duration_seconds: duration }); toast(`Đã nộp bài: ${score} điểm`) }
    catch (e) { toast('Chưa lưu được kết quả: ' + e.message, 'err') }
  }
  const saveWrong = async () => {
    const rows = qs.filter(x => ans[x.id] !== x.answer).map(x => ({
      user_id: user.id, vocabulary_id: x.word.id, status: 'learning', last_reviewed_at: new Date().toISOString(),
    }))
    if (rows.length) {
      const { error } = await supabase.from('user_vocabulary').upsert(rows, { onConflict: 'user_id,vocabulary_id' })
      if (error) return toast('Không lưu được từ sai: ' + error.message, 'err')
    }
    setSaved(true); toast(`Đã lưu ${rows.length} từ sai vào danh sách đang học`)
  }

  const title = `Đề số ${n}`

  // ------- KẾT QUẢ -------
  if (result) {
    const pass = result.score >= PASS
    const wrong = qs.filter(x => ans[x.id] !== x.answer)
    return (
      <>
        <PageHeader zh="成绩" title={`Kết quả ${title}`} crumbs={[['/exams', 'Thi thử'], [null, title]]}>{back}</PageHeader>
        <div className={'card exam-score ' + (pass ? 'pass' : 'fail')}>
          <span className="seal big">{pass ? '合格' : '再来'}</span>
          <div className="big-score">{result.score}<small>/100</small></div>
          <h3>{pass ? 'Đạt yêu cầu — làm tốt lắm!' : `Chưa đạt (cần ≥ ${PASS}) — luyện thêm nhé`}</h3>
          <p>Đúng {result.correct}/{qs.length} câu · thời gian {mmss(result.duration)}</p>
          <div className="row nb c">
            <button className="btn" onClick={() => { setAns({}); setCur(0); setResult(null); setSaved(false); t0.current = Date.now(); setSec(0) }}>Làm lại đề này</button>
            {n < total && <button className="btn gold" onClick={() => nav(`/exams/${encodeURIComponent(track)}/${n + 1}`)}>Đề tiếp theo ›</button>}
            {wrong.length > 0 && <button className="btn ghost" disabled={saved} onClick={saveWrong}>{saved ? 'Đã thêm vào ôn tập ✓' : `Lưu ${wrong.length} từ sai để ôn`}</button>}
          </div>
        </div>
        <h2 className="h2"><span className="zh">解析</span> Xem lại bài làm</h2>
        <div className="exam-review">
          {qs.map((x, i) => {
            const ok = ans[x.id] === x.answer
            return (
              <div key={x.id} className={'card rv ' + (ok ? 'ok' : 'bad')}>
                <small>Câu {i + 1} · {typeLabel(x.type)}</small>
                <p className="zh rvq">{x.prompt || '🔊 ' + x.speak}</p>
                <p>{ok ? '✔ ' : '✘ '}Bạn chọn: <b>{ans[x.id] ?? '(bỏ trống)'}</b></p>
                {!ok && <p>Đáp án đúng: <b>{x.answer}</b></p>}
                <p className="rvw"><b className="zh">{x.word.chinese}</b> · {x.word.pinyin} · {x.word.vietnamese}</p>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ------- LÀM BÀI -------
  return (
    <>
      <PageHeader zh="考试" title={title} crumbs={[['/exams', 'Thi thử'], [null, title]]} sub={`${qs.length} câu · làm xong bấm “Nộp bài”.`}>{back}</PageHeader>
      <div className="examwrap">
        <div className="card examq">
          <div className="pbar"><div className="track"><i style={{ width: `${answered / qs.length * 100}%` }} /></div>
            <span>Đã trả lời {answered}/{qs.length} · ⏱ {mmss(sec)}</span></div>
          <small className="qtype">Câu {cur + 1}/{qs.length} · {typeLabel(q.type)}</small>
          {q.type === 'listen'
            ? <button className="btn gold listen" onClick={() => speak(q.speak)}>🔊 Nghe lại</button>
            : <div className={'qprompt' + (q.type === 'zh2vi' || q.type === 'zh2py' || q.type === 'cloze' ? ' zh' : '')}>{q.prompt}</div>}
          {q.sub && <div className="pinyin">{q.sub}</div>}
          <div className="opts">
            {q.options.map(o => (
              <button key={o} className={'opt' + (ans[q.id] === o ? ' on' : '')} onClick={() => setAns({ ...ans, [q.id]: o })}>{o}</button>
            ))}
          </div>
          <div className="row nb c">
            <button className="btn ghost" disabled={cur === 0} onClick={() => setCur(cur - 1)}>‹ Câu trước</button>
            {cur < qs.length - 1
              ? <button className="btn" onClick={() => setCur(cur + 1)}>Câu sau ›</button>
              : <button className="btn gold" onClick={submit}>交卷 · Nộp bài</button>}
          </div>
        </div>
        <aside className="card examnav">
          <h5>Danh sách câu</h5>
          <div className="qdots">
            {qs.map((x, i) => <button key={x.id} className={(i === cur ? 'cur ' : '') + (ans[x.id] ? 'a' : '')} onClick={() => setCur(i)}>{i + 1}</button>)}
          </div>
          <button className="btn gold" onClick={() => (answered === qs.length || window.confirm(`Còn ${qs.length - answered} câu chưa trả lời. Vẫn nộp bài?`)) && submit()}>交卷 · Nộp bài</button>
        </aside>
      </div>
    </>
  )
}
