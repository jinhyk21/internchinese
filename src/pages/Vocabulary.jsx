import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import Bookmark from '../components/Bookmark.jsx'
import { Empty, PageHeader, Skeleton } from '../components/ui.jsx'
import { HSK_LEVELS, levelStats } from '../hsk.js'
import { norm, hasZh } from '../text.js'

const STATUS = [['learning', '学习中', 'Đang học'], ['remembered', '记住了', 'Đã nhớ'], ['mastered', '掌握', 'Thuộc']]
const PAGE_SIZE = 36
const speak = (t) => {
  const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'
  speechSynthesis.cancel(); speechSynthesis.speak(u)
}
// bỏ ký tự làm hỏng cú pháp .or() của PostgREST
const clean = (s) => s.replace(/[,()%*\\]/g, ' ').trim()

export default function Vocabulary() {
  const { user } = useAuth()
  const [cats, setCats] = useState([])
  const [level, setLevel] = useState('HSK 1')      // 'HSK n' | 'industry'
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [qd, setQd] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState('card')
  const [rows, setRows] = useState(null)
  const [count, setCount] = useState(0)
  const [prog, setProg] = useState({})
  const [marks, setMarks] = useState(new Set())
  const [flip, setFlip] = useState({})
  const [stat, setStat] = useState(null)
  const [review, setReview] = useState(null)
  const [err, setErr] = useState('')
  const seq = useRef(0)
  const noCol = useRef(false)

  useEffect(() => { supabase.from('categories').select('id,name,name_zh').order('display_order').then(({ data }) => setCats(data || [])) }, [])
  useEffect(() => { const t = setTimeout(() => { setQd(clean(q)); setPage(1) }, 300); return () => clearTimeout(t) }, [q])

  const load = useCallback(async () => {
    const my = ++seq.current
    setRows(null); setErr('')
    const from = (page - 1) * PAGE_SIZE
    const build = (useCol) => {
      let query = supabase.from('vocabulary').select('*', { count: 'exact' })
      if (!qd) {                       // đang tìm kiếm thì tìm trên TOÀN BỘ kho, không giới hạn cấp HSK
        if (level === 'industry') query = query.not('category_id', 'is', null)
        else query = query.eq('difficulty', level).is('category_id', null)   // tab HSK = từ chung, từ ngành nằm ở tab "Theo ngành"
      }
      if (cat !== 'all') query = query.eq('category_id', cat)
      if (qd) {
        const qn = norm(qd)
        if (useCol && !hasZh(qd)) query = query.ilike('search_text', `%${qn}%`)   // không dấu: "xin chao", "ni hao"
        else query = query.or(`chinese.ilike.%${qd}%,pinyin.ilike.%${qd}%,vietnamese.ilike.%${qd}%`)
      }
      return query.order('created_at').order('id').range(from, from + PAGE_SIZE - 1)
    }
    let { data, count: c, error } = await build(!noCol.current)
    if (error && /search_text/.test(error.message)) {            // chưa chạy db/06_search.sql
      noCol.current = true
      ;({ data, count: c, error } = await build(false))
    }
    if (my !== seq.current) return
    if (error) { setErr(error.message); setRows([]); return }
    setRows(data); setCount(c || 0)
    const ids = data.map(x => x.id)
    if (ids.length) {
      const [p, b] = await Promise.all([
        supabase.from('user_vocabulary').select('*').eq('user_id', user.id).in('vocabulary_id', ids),
        supabase.from('bookmarks').select('vocabulary_id').eq('user_id', user.id).eq('item_type', 'vocabulary').in('vocabulary_id', ids),
      ])
      if (my !== seq.current) return
      setProg(prev => ({ ...prev, ...Object.fromEntries((p.data || []).map(x => [x.vocabulary_id, x])) }))
      setMarks(new Set((b.data || []).map(x => x.vocabulary_id)))
    } else setMarks(new Set())
  }, [level, cat, qd, page, user.id])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    setStat(null)
    if (level !== 'industry') levelStats(user.id, level).then(setStat)
  }, [level, user.id, prog])

  const setStatus = async (vid, status) => {
    const row = {
      user_id: user.id, vocabulary_id: vid, status,
      review_count: (prog[vid]?.review_count || 0) + 1, last_reviewed_at: new Date().toISOString(),
    }
    const { data } = await supabase.from('user_vocabulary').upsert(row, { onConflict: 'user_id,vocabulary_id' }).select().single()
    if (data) setProg(p => ({ ...p, [vid]: data }))
  }

  // Ôn tập: lấy một khoảng ngẫu nhiên của cấp hiện tại, loại từ đã nhớ/thuộc
  const startReview = async () => {
    let query = supabase.from('vocabulary').select('*', { count: 'exact' })
    query = level === 'industry' ? query.not('category_id', 'is', null) : query.eq('difficulty', level).is('category_id', null)
    const { count: total } = await query.range(0, 0)
    const start = Math.max(0, Math.floor(Math.random() * Math.max(1, (total || 0) - 60)))
    let q2 = supabase.from('vocabulary').select('*')
    q2 = level === 'industry' ? q2.not('category_id', 'is', null) : q2.eq('difficulty', level).is('category_id', null)
    const { data } = await q2.order('created_at').order('id').range(start, start + 59)
    const ids = (data || []).map(x => x.id)
    const { data: up } = ids.length ? await supabase.from('user_vocabulary').select('vocabulary_id,status').eq('user_id', user.id).in('vocabulary_id', ids) : { data: [] }
    const known = new Set((up || []).filter(x => x.status !== 'learning').map(x => x.vocabulary_id))
    const deck = (data || []).filter(x => !known.has(x.id)).slice(0, 20)
    setReview({ deck, i: 0, flipped: false, done: 0 })
  }
  const rate = async (status) => {
    await setStatus(review.deck[review.i].id, status)
    setReview(r => ({ ...r, i: r.i + 1, flipped: false, done: r.done + (status !== 'learning' ? 1 : 0) }))
  }

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const pick = (l) => { setLevel(l); setCat('all'); setPage(1); setFlip({}) }
  const pageNums = (() => {
    const s = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2].filter(n => n >= 1 && n <= pages))
    const arr = [...s].sort((a, b) => a - b), out = []
    arr.forEach((n, i) => { if (i && n - arr[i - 1] > 1) out.push('d' + n); out.push(n) })
    return out
  })()
  const pct = stat && stat.total ? Math.round(stat.learned / stat.total * 100) : 0

  return (
    <>
      <PageHeader zh="词汇" title="Từ vựng HSK 1 – 9 & theo ngành" crumbs={[[null, 'Từ vựng']]}
        sub="Hơn 11.000 từ theo chuẩn HSK 3.0 và từ vựng chuyên ngành thực tập, có pinyin, nghĩa tiếng Việt và câu ví dụ.">
        <button className="btn gold" onClick={startReview}>复习 · Ôn tập {level === 'industry' ? 'từ ngành' : level}</button>
      </PageHeader>

      <div className="chips levels">
        {HSK_LEVELS.map(l => <button key={l} className={level === l ? 'chip on' : 'chip'} onClick={() => pick(l)}>{l}</button>)}
        <button className={level === 'industry' ? 'chip on' : 'chip'} onClick={() => pick('industry')}>行业 · Theo ngành</button>
      </div>

      {level !== 'industry' && (
        <div className="levelbar">
          <div><b>{level}</b> · {stat ? stat.total.toLocaleString('vi-VN') : '…'} từ</div>
          <div className="track"><i style={{ width: pct + '%' }} /></div>
          <span>Đã nhớ <b>{stat?.learned ?? 0}</b> · Thuộc <b>{stat?.mastered ?? 0}</b> ({pct}%)</span>
        </div>
      )}

      <div className="toolbar">
        <input className="search" placeholder="搜索 · Tìm chữ Hán, pinyin hoặc nghĩa…" value={q} onChange={e => setQ(e.target.value)} />
        {level === 'industry' && (
          <select className="sel" value={cat} onChange={e => { setCat(e.target.value); setPage(1) }}>
            <option value="all">Tất cả ngành</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name_zh} · {c.name}</option>)}
          </select>
        )}
        <div className="seg2">
          <button className={view === 'card' ? 'on' : ''} onClick={() => setView('card')}>Thẻ</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Danh sách</button>
        </div>
      </div>

      {err && <p className="msg">{err}</p>}
      <p className="resultinfo">{rows ? `${count.toLocaleString('vi-VN')} từ · trang ${page}/${pages}` : 'Đang tải…'}
        {qd && <> · <b>đang tìm “{qd}” trên toàn bộ kho từ (mọi cấp HSK)</b></>}</p>

      {!rows ? <Skeleton n={12} h={210} /> : !rows.length ? (
        <Empty zh="词" title="Chưa có từ vựng phù hợp" text={qd ? 'Không có kết quả cho từ khóa này.' : 'Cấp này chưa có dữ liệu.'} />
      ) : view === 'card' ? (
        <div className="grid vgrid">
          {rows.map(w => (
            <article className="card flash" key={w.id}>
              <Bookmark kind="vocabulary" id={w.id} initial={marks.has(w.id)} />
              <span className="lvl">{w.difficulty}</span>
              <div onClick={() => setFlip({ ...flip, [w.id]: !flip[w.id] })} className="face">
                {!flip[w.id] ? (
                  <><div className="hanzi">{w.chinese}</div><div className="pinyin">{w.pinyin}</div><small>Nhấn để lật</small></>
                ) : (
                  <><div className="vi">{w.vietnamese}</div>
                    {w.example_chinese && <><p className="zh ex">{w.example_chinese}</p><small>{w.example_pinyin}</small><small>{w.example_vietnamese}</small></>}</>
                )}
              </div>
              <div className="row">
                <button className="btn ghost sm" onClick={() => speak(w.chinese)} aria-label="Nghe">🔊</button>
                {STATUS.map(([k, zh, vi]) => (
                  <button key={k} title={vi} className={'chip sm' + (prog[w.id]?.status === k ? ' on' : '')} onClick={() => setStatus(w.id, k)}>{zh}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card tbl"><table className="resp vlist">
          <thead><tr><th>汉字</th><th>Pinyin</th><th>Nghĩa</th><th>Cấp</th><th>Tiến độ</th><th /></tr></thead>
          <tbody>{rows.map(w => (
            <tr key={w.id}>
              <td data-label="汉字"><b className="zh big">{w.chinese}</b></td>
              <td data-label="Pinyin" className="pinyin">{w.pinyin}</td>
              <td data-label="Nghĩa">{w.vietnamese}{w.example_chinese && <small className="zh">{w.example_chinese}</small>}</td>
              <td data-label="Cấp"><span className="tag">{w.difficulty}</span></td>
              <td data-label="Tiến độ"><div className="row nb">{STATUS.map(([k, zh]) => (
                <button key={k} className={'chip sm' + (prog[w.id]?.status === k ? ' on' : '')} onClick={() => setStatus(w.id, k)}>{zh}</button>))}</div></td>
              <td><button className="btn ghost sm" onClick={() => speak(w.chinese)}>🔊</button></td>
            </tr>))}</tbody>
        </table></div>
      )}

      {pages > 1 && (
        <nav className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          {pageNums.map(n => typeof n === 'string'
            ? <span key={n} className="dots">…</span>
            : <button key={n} className={n === page ? 'on' : ''} onClick={() => setPage(n)}>{n}</button>)}
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
        </nav>
      )}

      {review && (
        <div className="overlay" onClick={() => setReview(null)}>
          <div className="reviewbox" onClick={e => e.stopPropagation()}>
            <button className="x" onClick={() => setReview(null)}>✕</button>
            {review.i >= review.deck.length ? (
              <div className="rv-done"><span className="seal big">好</span>
                <h3>{review.deck.length ? 'Hoàn thành lượt ôn!' : 'Không còn từ chưa nhớ trong đoạn này'}</h3>
                <p>{review.deck.length ? `Bạn đã nhớ ${review.done}/${review.deck.length} từ.` : 'Hãy thử lại để lấy đoạn khác.'}</p>
                <div className="row nb c"><button className="btn" onClick={startReview}>Ôn lượt mới</button><button className="btn ghost" onClick={() => setReview(null)}>Đóng</button></div>
              </div>
            ) : (() => {
              const w = review.deck[review.i]
              return (
                <>
                  <div className="track"><i style={{ width: `${review.i / review.deck.length * 100}%` }} /></div>
                  <small>{review.i + 1} / {review.deck.length} · {w.difficulty}</small>
                  <div className="rv-face" onClick={() => setReview({ ...review, flipped: !review.flipped })}>
                    {!review.flipped ? <><div className="hanzi huge">{w.chinese}</div><div className="pinyin">{w.pinyin}</div><small>Nhấn để xem nghĩa</small></>
                      : <><div className="vi">{w.vietnamese}</div>{w.example_chinese && <p className="zh ex">{w.example_chinese}</p>}<small>{w.example_vietnamese}</small></>}
                  </div>
                  <div className="row nb c">
                    <button className="btn ghost" onClick={() => speak(w.chinese)}>🔊</button>
                    <button className="btn ghost" onClick={() => rate('learning')}>Chưa nhớ</button>
                    <button className="btn" onClick={() => rate('remembered')}>Đã nhớ</button>
                    <button className="btn gold" onClick={() => rate('mastered')}>Thuộc</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}
