import { useEffect, useMemo, useRef, useState } from 'react'
import { pinyin } from 'pinyin-pro'
import { supabase } from '../supabase'
import { useToast } from '../toast.jsx'
import { aiTranslate } from '../ai.js'
import { hasZh, norm } from '../text.js'
import { PageHeader } from '../components/ui.jsx'
import HandwritingPad from '../components/HandwritingPad.jsx'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }
const HKEY = 'ic_translate_hist'
const loadHist = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || [] } catch { return [] } }

// tách câu tiếng Trung thành từ bằng cách khớp dài nhất với bảng từ vựng
async function breakdown(text) {
  const t = [...text.replace(/[^一-鿿]/g, '')].slice(0, 80)
  if (!t.length) return []
  const cand = new Set()
  for (let i = 0; i < t.length; i++) for (let l = 1; l <= 4 && i + l <= t.length; l++) cand.add(t.slice(i, i + l).join(''))
  const { data } = await supabase.from('vocabulary').select('chinese,pinyin,vietnamese').in('chinese', [...cand].slice(0, 300))
  const map = new Map((data || []).map(x => [x.chinese, x]))
  const out = []
  for (let i = 0; i < t.length;) {
    let hit = null
    for (let l = Math.min(4, t.length - i); l >= 1; l--) { const w = t.slice(i, i + l).join(''); if (map.has(w)) { hit = map.get(w); i += l; break } }
    if (hit) out.push(hit); else { out.push({ chinese: t[i], pinyin: pinyin(t[i]), vietnamese: '' }); i++ }
  }
  return out
}

export default function Translate() {
  const toast = useToast()
  const [dir, setDir] = useState('zh-vi')
  const [text, setText] = useState('')
  const [pad, setPad] = useState(false)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [hist, setHist] = useState(loadHist)
  const [copied, setCopied] = useState(false)
  const ta = useRef(null)
  const zhIn = dir === 'zh-vi'

  useEffect(() => { if (!zhIn) setPad(false) }, [zhIn])

  const insert = (ch) => {            // chèn chữ viết tay tại vị trí con trỏ
    const el = ta.current, s = el?.selectionStart ?? text.length, e = el?.selectionEnd ?? text.length
    setText(text.slice(0, s) + ch + text.slice(e))
    setTimeout(() => { el?.focus(); el?.setSelectionRange(s + ch.length, s + ch.length) }, 0)
  }

  const run = async () => {
    const t = text.trim()
    if (!t) return
    setBusy(true); setRes(null)
    const [ai, words, hits] = await Promise.all([
      aiTranslate(t, dir),
      zhIn ? breakdown(t) : Promise.resolve([]),
      zhIn ? Promise.resolve([]) : supabase.from('vocabulary').select('chinese,pinyin,vietnamese').ilike('search_text', `%${norm(t)}%`).limit(8)
        .then(r => (r.error ? supabase.from('vocabulary').select('chinese,pinyin,vietnamese').ilike('vietnamese', `%${t}%`).limit(8) : r)).then(r => r.data || []),
    ])
    const out = ai?.translation || null
    setRes({ ai, words, hits, src: t, dir, zh: zhIn ? t : out })
    setBusy(false)
    const item = { src: t, dir, out }
    const next = [item, ...hist.filter(h => !(h.src === t && h.dir === dir))].slice(0, 12)
    setHist(next); try { localStorage.setItem(HKEY, JSON.stringify(next)) } catch { /* bỏ qua */ }
  }

  const swap = () => { const nd = zhIn ? 'vi-zh' : 'zh-vi'; setDir(nd); setText(res?.ai?.translation || ''); setRes(null) }
  const copy = async (s) => { try { await navigator.clipboard.writeText(s); setCopied(true); setTimeout(() => setCopied(false), 1200); toast('Đã sao chép') } catch { toast('Không sao chép được', 'err') } }
  const zhText = res?.zh
  const py = useMemo(() => (zhText && hasZh(zhText) ? pinyin(zhText) : ''), [zhText])

  return (
    <>
      <PageHeader zh="翻译" title="Dịch Trung ⇄ Việt" sub="Gõ hoặc viết tay chữ Hán, xem pinyin, nghĩa từng từ và nghe đọc." />
      <div className="tr">
        <div className="tr-bar">
          <span className={'tr-lang zh' + (zhIn ? ' src' : '')}>中文</span>
          <button className="tr-swap" onClick={swap} title="Đổi chiều dịch">⇄</button>
          <span className={'tr-lang' + (!zhIn ? ' src' : '')}>Tiếng Việt</span>
        </div>

        <div className="tr-grid">
          <section className="card tr-in">
            <textarea ref={ta} rows={6} value={text} onChange={e => setText(e.target.value)}
              placeholder={zhIn ? '输入或手写中文… Nhập hoặc viết tay chữ Hán' : 'Nhập tiếng Việt cần dịch sang tiếng Trung…'}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run() }} />
            <div className="tr-actions">
              {zhIn && <button type="button" className={'btn ghost sm' + (pad ? ' on' : '')} onClick={() => setPad(!pad)}>✍ Viết tay</button>}
              {zhIn && text && <button type="button" className="btn ghost sm" onClick={() => speak(text)}>🔊</button>}
              <button type="button" className="btn ghost sm" onClick={() => { setText(''); setRes(null) }} disabled={!text}>✕ Xóa</button>
              <button type="button" className="btn" onClick={run} disabled={busy || !text.trim()}>{busy ? 'Đang dịch…' : '翻译 · Dịch'}</button>
            </div>
            {pad && <HandwritingPad onPick={insert} />}
          </section>

          <section className="card tr-out">
            {!res && !busy && <p className="tr-empty"><span className="zh">译</span>Kết quả dịch sẽ hiện ở đây.</p>}
            {busy && <p className="tr-empty">Đang dịch…</p>}
            {res && (
              <>
                {res.ai ? (
                  <>
                    <p className={'tr-main' + (res.dir === 'vi-zh' ? ' zh big' : '')}>{res.ai.translation}</p>
                    {py && res.dir === 'vi-zh' && <p className="tr-py">{py}</p>}
                    {res.dir === 'zh-vi' && py && <p className="tr-py">{py}</p>}
                    <div className="tr-actions">
                      {zhText && <button className="btn ghost sm" onClick={() => speak(zhText)}>🔊 Nghe</button>}
                      <button className="btn ghost sm" onClick={() => copy(res.ai.translation)}>{copied ? 'Đã chép ✓' : '⧉ Sao chép'}</button>
                    </div>
                    {res.ai.alternatives?.length > 0 && <div className="tr-alt"><small>Cách nói khác</small>{res.ai.alternatives.map(a => <p key={a} className={res.dir === 'vi-zh' ? 'zh' : ''}>{a}</p>)}</div>}
                    {res.ai.note && <p className="tr-note">💡 {res.ai.note}</p>}
                  </>
                ) : (
                  <p className="tr-warn">Dịch cả câu cần Gemini nhưng hiện chưa dùng được (hết hạn mức hoặc chưa có key). Bên dưới là tra từng từ từ kho từ vựng.</p>
                )}
                {res.dir === 'zh-vi' && res.words.length > 0 && (
                  <div className="tr-words"><small>Nghĩa từng từ</small>
                    <div>{res.words.map((w, i) => (
                      <button key={i} className="tr-w" onClick={() => speak(w.chinese)}>
                        <span className="zh">{w.chinese}</span><em>{w.pinyin}</em><b>{w.vietnamese || '—'}</b>
                      </button>))}</div></div>
                )}
                {res.dir === 'vi-zh' && !res.ai && res.hits.length > 0 && (
                  <div className="tr-words"><small>Từ vựng liên quan</small>
                    <div>{res.hits.map(w => (
                      <button key={w.chinese} className="tr-w" onClick={() => speak(w.chinese)}>
                        <span className="zh">{w.chinese}</span><em>{w.pinyin}</em><b>{w.vietnamese}</b></button>))}</div></div>
                )}
              </>
            )}
          </section>
        </div>

        {hist.length > 0 && (
          <section className="card tr-hist"><h4>Gần đây</h4>
            {hist.map(h => (
              <button key={h.src + h.dir} onClick={() => { setDir(h.dir); setText(h.src); setRes(null) }}>
                <span className={h.dir === 'zh-vi' ? 'zh' : ''}>{h.src}</span><small>{h.out || '—'}</small></button>))}
            <button className="link" onClick={() => { setHist([]); localStorage.removeItem(HKEY) }}>Xóa lịch sử</button>
          </section>
        )}
      </div>
    </>
  )
}
