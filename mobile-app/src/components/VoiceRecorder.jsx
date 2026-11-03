import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from '../ai.js'

const SR = window.SpeechRecognition || window.webkitSpeechRecognition
const MAX_SEC = 90
const BARS = 36

// Popup ghi âm: thanh sóng âm theo mic, đếm giờ, chữ nhận diện hiện trực tiếp, bấm "Dừng & gửi" khi nói xong.
export default function VoiceRecorder({ onSend, onClose }) {
  const [phase, setPhase] = useState('starting')   // starting | rec | review | error
  const [sec, setSec] = useState(0)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [blob, setBlob] = useState(null)
  const [busy, setBusy] = useState(false)
  const canvas = useRef(null)
  const R = useRef({ base: '', live: '', active: false })

  const cleanup = useCallback(async () => {
    const r = R.current
    r.active = false
    clearInterval(r.timer); cancelAnimationFrame(r.raf)
    try { r.sr?.stop() } catch { /* đã dừng */ }
    if (r.rec && r.rec.state !== 'inactive') await new Promise(res => { r.rec.onstop = res; r.rec.stop() })
    r.stream?.getTracks().forEach(t => t.stop())
    try { await r.ctx?.close() } catch { /* đã đóng */ }
  }, [])

  const start = useCallback(async () => {
    const r = R.current
    setPhase('starting'); setMsg(''); setText(''); setSec(0); setBlob(null)
    r.base = ''; r.live = ''; r.chunks = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      r.stream = stream
      r.rec = new MediaRecorder(stream)
      r.rec.ondataavailable = e => e.data.size && r.chunks.push(e.data)
      r.rec.start(250)

      // sóng âm
      r.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const an = r.ctx.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = 0.75
      r.ctx.createMediaStreamSource(stream).connect(an)
      const data = new Uint8Array(an.frequencyBinCount)
      const draw = () => {
        const cv = canvas.current
        if (cv) {
          const c = cv.getContext('2d'), w = cv.width, h = cv.height
          an.getByteFrequencyData(data)
          c.clearRect(0, 0, w, h)
          const bw = w / BARS
          for (let i = 0; i < BARS; i++) {
            const v = data[Math.floor(i * (data.length * 0.7) / BARS)] / 255
            const bh = Math.max(4, v * h)
            c.fillStyle = v > 0.6 ? '#b3202a' : '#c9a227'
            c.fillRect(i * bw + 2, (h - bh) / 2, bw - 4, bh)
          }
        }
        r.raf = requestAnimationFrame(draw)
      }
      draw()

      // nhận diện chữ (không có thì bỏ qua, người dùng gõ lại sau khi dừng)
      r.active = true
      if (SR) {
        const run = () => {
          const sr = new SR(); r.sr = sr
          sr.lang = 'zh-CN'; sr.continuous = true; sr.interimResults = true
          sr.onresult = (e) => {
            let f = '', i = ''
            for (const x of e.results) (x.isFinal ? (f += x[0].transcript) : (i += x[0].transcript))
            r.live = f + i; r.sessFinal = f
            setText(r.base + r.live)
          }
          sr.onend = () => { if (r.active) { r.base += r.sessFinal || r.live || ''; r.live = ''; r.sessFinal = ''; try { run() } catch { /* bỏ qua */ } } }
          sr.onerror = (e) => {
            if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'network'].includes(e.error)) {
              r.active = false   // lỗi không tự hết → không thử lại mãi
              setMsg('Trình duyệt không nhận diện được chữ (' + e.error + '). Cứ nói tiếp — khi bấm “Dừng & gửi” hệ thống sẽ nhận diện từ bản ghi âm.')
            }
          }
          sr.start()
        }
        run()
      } else setMsg('Trình duyệt chưa hỗ trợ nhận diện chữ — sau khi dừng bạn gõ lại nội dung rồi gửi.')

      const t0 = Date.now()
      r.timer = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 250)
      setPhase('rec')
    } catch (err) {
      await cleanup()
      const n = err?.name
      setPhase('error')
      if (!navigator.mediaDevices?.getUserMedia) setMsg('Trang cần chạy qua HTTPS để dùng micro.')
      else if (n === 'NotFoundError') setMsg('Không tìm thấy micro trên thiết bị.')
      else if (n === 'NotReadableError') setMsg('Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.')
      else setMsg('Không xin được quyền micro. Nếu máy báo “Trang web này không thể yêu cầu bạn cấp quyền”, hãy tắt bong bóng chat nổi (Messenger, Zalo…) và quay màn hình, rồi bấm Thử lại. Nếu trước đó đã chọn “Chặn”, vào biểu tượng ổ khóa cạnh địa chỉ → Quyền → Micro → Cho phép.')
    }
  }, [])

  useEffect(() => { start(); return () => { cleanup() } }, [start, cleanup])

  const stop = async () => {
    const r = R.current
    let said = (r.base + r.live).trim()
    await cleanup()
    const b = new Blob(r.chunks, { type: r.rec?.mimeType || 'audio/webm' })
    if (!said && b.size > 1000) { setBusy(true); setMsg('Đang nhận diện giọng nói…'); said = await transcribeAudio(b); setBusy(false) }
    if (said) onSend(said, b)
    else { setBlob(b); setText(''); setPhase('review'); setMsg('Chưa nhận diện được lời nói. Bạn có thể nghe lại, gõ nội dung rồi gửi, hoặc ghi âm lại.') }
  }
  useEffect(() => { if (phase === 'rec' && sec >= MAX_SEC) stop() })   // tự dừng & gửi khi đủ thời gian

  const cancel = async () => { await cleanup(); onClose() }
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const url = blob ? URL.createObjectURL(blob) : null
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  return (
    <div className="overlay" onClick={cancel}>
      <div className="reviewbox recbox" onClick={e => e.stopPropagation()}>
        <button className="x" onClick={cancel} aria-label="Đóng">✕</button>
        <span className={'seal big' + (phase === 'rec' ? ' pulse' : '')}>{phase === 'review' ? '听' : '说'}</span>

        {phase === 'error' ? (
          <>
            <h3>Không ghi âm được</h3>
            <p className="msg">{msg}</p>
            <div className="row nb c"><button className="btn" onClick={start}>Thử lại</button><button className="btn ghost" onClick={cancel}>Đóng</button></div>
          </>
        ) : phase === 'review' ? (
          <>
            <h3>Kiểm tra trước khi gửi</h3>
            {url && <audio controls src={url} className="rec-audio" />}
            <textarea rows={3} autoFocus placeholder="请输入你说的话… Gõ nội dung bạn vừa nói" value={text} onChange={e => setText(e.target.value)} />
            {msg && <p className="rec-hint">{msg}</p>}
            <div className="row nb c">
              <button className="btn ghost" onClick={start}>Ghi lại</button>
              <button className="btn" disabled={!text.trim()} onClick={() => onSend(text.trim(), blob)}>发送 · Gửi</button>
            </div>
          </>
        ) : (
          <>
            <h3>{phase === 'starting' ? 'Đang mở micro…' : 'Đang ghi âm — hãy nói tiếng Trung'}</h3>
            <div className="rec-time"><i className="dot" />{mmss}<small> / {MAX_SEC / 60 * 60}s</small></div>
            <canvas ref={canvas} width={420} height={90} className="rec-wave" />
            <p className={'rec-live zh' + (text ? '' : ' empty')}>{text || (SR ? '说话时文字会出现在这里…' : '')}</p>
            {msg && <p className="rec-hint">{msg}</p>}
            <div className="row nb c">
              <button className="btn ghost" onClick={cancel}>Hủy</button>
              <button className="btn" disabled={phase !== 'rec' || busy} onClick={stop}>■ Dừng & gửi</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
