import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'
import { uploadMedia, mediaUrl } from '../storage.js'
import { useBreakpoint } from '../useBreakpoint.js'
import { Skeleton } from '../components/ui.jsx'
import { aiChat, aiEvaluate, aiMode } from '../ai.js'

import VoiceRecorder from '../components/VoiceRecorder.jsx'
const speak = (t) => {
  const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'
  speechSynthesis.cancel(); speechSynthesis.speak(u)
}

export default function Practice() {
  const { scenarioId } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const bp = useBreakpoint()
  const [pane, setPane] = useState('chat')
  const level = profile?.chinese_level || 'HSK 3'
  const [sc, setSc] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [showVi, setShowVi] = useState(true)
  const [voice, setVoice] = useState(false)
  const [rec, setRec] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sec, setSec] = useState(0)
  const [done, setDone] = useState({})
  const started = useRef(Date.now())
  const endRef = useRef(null)
  const init = useRef(false)

  useEffect(() => {
    if (init.current) return
    init.current = true
    ;(async () => {
      const { data: s } = await supabase.from('scenarios').select('*').eq('id', scenarioId).single()
      setSc(s)
      const { data: old } = await supabase.from('conversation_sessions').select('*')
        .eq('scenario_id', scenarioId).eq('status', 'in_progress')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (old) {
        const { data: ms } = await supabase.from('conversation_messages').select('*')
          .eq('session_id', old.id).order('created_at')
        setSessionId(old.id); setMsgs(ms || [])
        setVoice(old.communication_mode === 'voice')
        started.current = Date.now() - (old.duration_seconds || 0) * 1000
        return
      }
      const { data: ses } = await supabase.from('conversation_sessions')
        .insert({ user_id: user.id, scenario_id: scenarioId, title: s.title_zh }).select().single()
      setSessionId(ses.id)
      if (s.initial_message) {
        const { data: m } = await supabase.from('conversation_messages')
          .insert({ session_id: ses.id, sender: 'assistant', content: s.initial_message }).select().single()
        setMsgs([m])
      }
    })()
  }, [scenarioId, user.id])

  useEffect(() => {
    const t = setInterval(() => setSec(Math.round((Date.now() - started.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { const el = endRef.current?.parentElement; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) }, [msgs])

  const setMode = async (v) => {
    setVoice(v)
    if (sessionId) {
      const { error } = await supabase.from('conversation_sessions').update({ communication_mode: v ? 'voice' : 'text' }).eq('id', sessionId)
      if (error) return toast('Không đổi được chế độ: ' + error.message, 'err')
    }
    toast(v ? 'Đã bật chế độ giọng nói' : 'Đã chuyển sang chế độ gõ chữ', 'info')
  }

  const send = async (content, audio) => {
    content = content.trim()
    if (!content || !sessionId || busy) return
    setText(''); setErr(''); setBusy(true)
    try {
      let audio_url = null
      if (audio) {
        try { audio_url = await uploadMedia(`audio/${user.id}/${sessionId}/${Date.now()}.webm`, audio) }
        catch { /* vẫn gửi tin nhắn dù không lưu được âm thanh */ }
      }
      const { data: m } = await supabase.from('conversation_messages')
        .insert({ session_id: sessionId, sender: 'user', content, audio_url }).select().single()
      const history = [...msgs, m]
      setMsgs(history)
      const r = await aiChat(sc, level, history)
      const { data: a } = await supabase.from('conversation_messages')
        .insert({ session_id: sessionId, sender: 'assistant', content: r.reply, pinyin: r.pinyin, translated_content: r.vi })
        .select().single()
      setMsgs([...history, a])
      if (voice) speak(r.reply)
    } catch (e) { setErr(e.message); toast('Gửi tin nhắn thất bại: ' + e.message, 'err') } finally { setBusy(false) }
  }

  const playMine = async (path) => { const u = await mediaUrl(path); if (u) new Audio(u).play() }

  const finish = async (status) => {
    setBusy(true); setErr('')
    const seconds = Math.round((Date.now() - started.current) / 1000)
    const mine = msgs.filter(m => m.sender === 'user')
    try {
      await supabase.from('conversation_sessions').update({
        status, completed_at: new Date().toISOString(), duration_seconds: seconds,
      }).eq('id', sessionId)
      if (status === 'completed' && mine.length) {
        const ev = await aiEvaluate(sc, level, msgs)
        const { error } = await supabase.from('conversation_evaluations').insert({
          session_id: sessionId, user_id: user.id,
          overall_score: ev.overall_score, pronunciation_score: ev.pronunciation_score,
          grammar_score: ev.grammar_score, vocabulary_score: ev.vocabulary_score,
          fluency_score: ev.fluency_score, communication_score: ev.communication_score,
          strengths: ev.strengths, weaknesses: ev.weaknesses, corrections: ev.corrections,
          recommendations: ev.recommendations, detailed_feedback: { summary: ev.summary },
        })
        if (error) throw error
        toast('Đã chấm điểm xong buổi luyện')
        return nav(`/history/${sessionId}`)
      }
      toast('Đã kết thúc buổi luyện', 'info')
      nav('/history')
    } catch (e) {
      setErr('Đã lưu buổi luyện nhưng chưa chấm điểm được: ' + e.message); toast('Chưa chấm điểm được: ' + e.message, 'err'); setBusy(false)
    }
  }

  if (!sc) return <Skeleton n={2} h={320} />
  const phrases = Array.isArray(sc.suggested_phrases) ? sc.suggested_phrases : []
  const turns = msgs.filter(m => m.sender === 'user').length
  const goal = 6
  const pct = Math.min(100, Math.round(turns / goal * 100))
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  return (
    <div className={'practice ' + bp + ' pane-' + pane}>
      {bp === 'mobile' && (
        <div className="p-bar">
          <button className="back" onClick={() => nav(-1)}>‹</button>
          <b className="zh">{sc.title_zh}</b>
          <div className="seg">
            <button className={pane === 'chat' ? 'on' : ''} onClick={() => setPane('chat')}>对话</button>
            <button className={pane === 'info' ? 'on' : ''} onClick={() => setPane('info')}>情景</button>
          </div>
        </div>
      )}
      <aside className="card scroll">
        <span className="seal sm">练</span>
        <h3 className="zh">{sc.title_zh}</h3>
        <h4>{sc.title}</h4>
        <p>{sc.situation}</p>
        <p className="role">对方 · Vai AI: <b>{sc.ai_role_zh} ({sc.ai_role})</b></p>
        <h5>学习目标 · Mục tiêu</h5>
        <ul className="checklist">{sc.learning_objectives?.map(o => (
          <li key={o}><label><input type="checkbox" checked={!!done[o]} onChange={e => setDone({ ...done, [o]: e.target.checked })} /> {o}</label></li>
        ))}</ul>
        <h5>常用句 · Câu gợi ý</h5>
        {phrases.map(p => (
          <button key={p.zh} className="phrase" onClick={() => setText(p.zh)}>
            <span className="zh">{p.zh}</span><small>{p.vi}</small>
          </button>
        ))}
      </aside>
      <section className="chat">
        <div className="chat-head">
          <div className="toggles">
            <label><input type="checkbox" checked={showVi} onChange={e => setShowVi(e.target.checked)} /> Tiếng Việt</label>
            <small>AI: {aiMode === 'gemini' ? 'Gemini' : 'Bộ luật nội bộ'}</small>
            <label><input type="checkbox" checked={voice} onChange={e => setMode(e.target.checked)} /> Chế độ giọng nói</label>
          </div>
          <div>
            <button className="btn ghost sm" disabled={busy} onClick={() => finish('abandoned')}>放弃</button>
            <button className="btn sm" disabled={busy} onClick={() => finish('completed')}>完成 · Hoàn thành</button>
          </div>
        </div>
        <div className="pbar"><div className="track"><i style={{ width: pct + '%' }} /></div>
          <span>{turns}/{goal} lượt · ⏱ {mmss}</span></div>
        <div className="msgs">
          {msgs.map(m => (
            <div key={m.id} className={'bubble ' + m.sender}>
              <span className="zh">{m.content}</span>
              {m.sender === 'assistant' && <button className="speak" onClick={() => speak(m.content)}>🔊</button>}
              {m.audio_url && <button className="speak" onClick={() => playMine(m.audio_url)}>▶</button>}
              {m.pinyin && <small>{m.pinyin}</small>}
              {showVi && m.translated_content && <small>{m.translated_content}</small>}
            </div>
          ))}
          {busy && <div className="bubble assistant"><small>…</small></div>}
          <div ref={endRef} />
        </div>
        {err && <p className="msg" style={{ padding: '0 1rem' }}>{err}</p>}
        <form className="composer" onSubmit={e => { e.preventDefault(); send(text) }}>
          <button type="button" className="btn ghost mic" disabled={busy} onClick={() => setRec(true)} aria-label="Ghi âm">🎤</button>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="请输入中文… Nhập tiếng Trung" />
          <button className="btn" disabled={busy}>发送</button>
        </form>
      </section>
      {rec && <VoiceRecorder onClose={() => setRec(false)} onSend={(t, b) => { setRec(false); send(t, b) }} />}
    </div>
  )
}
