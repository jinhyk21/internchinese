import { supabase } from './supabase'
import { HSK_LEVELS } from './hsk.js'

// ---- Đề thi thử: sinh tất định từ kho từ vựng (cùng track + số đề → luôn ra cùng một đề) ----
export const TRACKS = HSK_LEVELS
export const isIndustry = (track) => track.startsWith('cat:')
export const examCount = (track) => (track === 'HSK 7-9' ? 300 : 100)      // HSK 7-9 gấp 3 lần
export const examSize = (track) => (isIndustry(track) ? 20 : 30)
export const PASS = 60

// 4 kỹ năng, theo thứ tự trong đề: Nghe → Nói → Đọc → Viết
export const SKILLS = [
  { key: 'listen', zh: '听', vi: 'Nghe' },
  { key: 'speak', zh: '说', vi: 'Nói' },
  { key: 'read', zh: '读', vi: 'Đọc' },
  { key: 'write', zh: '写', vi: 'Viết' },
]
export const SPEAK_PASS = 60            // điểm phát âm tối thiểu để tính câu Nói là đúng

const TYPE_LABEL = {
  listen: '听 Nghe · Nghe và chọn chữ Hán',
  listen2vi: '听 Nghe · Nghe và chọn nghĩa tiếng Việt',
  speak: '说 Nói · Đọc to từ sau (chấm phát âm)',
  zh2vi: '读 Đọc · Chọn nghĩa đúng',
  vi2zh: '读 Đọc · Chọn chữ Hán đúng',
  zh2py: '读 Đọc · Chọn phiên âm đúng',
  py2zh: '读 Đọc · Chọn chữ Hán đúng từ pinyin',
  cloze: '读 Đọc · Điền từ vào chỗ trống',
  write: '写 Viết · Viết chữ Hán theo nghĩa và pinyin',
}
export const typeLabel = (t) => TYPE_LABEL[t]
const SKILL_OF = { listen: 'listen', listen2vi: 'listen', speak: 'speak', write: 'write' }
export const skillOf = (q) => SKILL_OF[q.type] || 'read'

const strip = (v) => String(v || '').replace(/\s+/g, '')
// Câu trả lời có đúng không: Nói → điểm phát âm đạt · Viết → khớp chữ Hán · còn lại → khớp đáp án
export function isRight(q, a) {
  if (a == null) return false
  if (q.type === 'speak') return a.score >= SPEAK_PASS
  if (q.type === 'write') return strip(a) === strip(q.answer)
  return a === q.answer
}
// Câu đã có trả lời hay chưa (để tô màu danh sách câu)
export const hasAnswer = (q, a) => (q.type === 'speak' ? a != null : !!a)

function seedOf(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0 }
}
function rng(str) {
  let a = seedOf(str)()
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function shuffle(arr, rnd) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

const cache = new Map()
// Tải kho từ của một track (chỉ 5 cột, phân trang 1000 dòng) rồi nhớ lại trong bộ nhớ
export async function fetchPool(track) {
  if (cache.has(track)) return cache.get(track)
  let out = [], from = 0
  for (;;) {
    let q = supabase.from('vocabulary').select('id,chinese,pinyin,vietnamese,example_chinese')
    q = isIndustry(track) ? q.eq('category_id', track.slice(4)) : q.eq('difficulty', track).is('category_id', null)
    const { data, error } = await q.order('id').range(from, from + 999)
    if (error) throw error
    out = out.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  const seen = new Set()
  out = out.filter(w => w.chinese && w.pinyin && w.vietnamese && !seen.has(w.chinese) && seen.add(w.chinese))
  cache.set(track, out)
  return out
}

export function buildExam(pool, track, no) {
  const rnd = rng(`${track}#${no}`)
  const size = Math.min(examSize(track), pool.length)
  const words = shuffle(pool, rnd).slice(0, size)

  // chia số câu theo kỹ năng: Nghe 25% · Nói 15% · Viết 20% · Đọc phần còn lại
  const nListen = Math.round(size * .25), nSpeak = Math.round(size * .15), nWrite = Math.round(size * .2)
  const nRead = size - nListen - nSpeak - nWrite
  // câu Nói / Viết ưu tiên từ ngắn (≤ 4 chữ) để dễ đọc và dễ viết
  const short = words.filter(w => w.chinese.length <= 4), long = words.filter(w => w.chinese.length > 4)
  const used = new Set(), take = (n, list) => { const o = []; for (const w of list) { if (o.length < n && !used.has(w)) { used.add(w); o.push(w) } } return o }
  const wSpeak = take(nSpeak, short), wWrite = take(nWrite, short)
  const wListen = take(nListen, [...long, ...short]), wRead = take(nRead, [...long, ...short])
  for (const w of words) if (!used.has(w)) { used.add(w); (wRead.length < nRead ? wRead : wListen).push(w) }

  const options = (key, w) => {
    const ans = w[key], out = new Set([ans])
    for (let tries = 0; out.size < 4 && tries < 120; tries++) {
      const c = pool[Math.floor(rnd() * pool.length)]
      if (tries < 60 && c.chinese.length !== w.chinese.length) continue     // ưu tiên đáp án nhiễu cùng độ dài → khó phân biệt hơn
      if (c[key] && !out.has(c[key])) out.add(c[key])
    }
    return shuffle([...out], rnd)
  }

  const out = []
  const push = (q) => out.push({ id: out.length, ...q })
  wListen.forEach((w, i) => i % 2
    ? push({ type: 'listen2vi', word: w, speak: w.chinese, answer: w.vietnamese, options: options('vietnamese', w) })
    : push({ type: 'listen', word: w, speak: w.chinese, answer: w.chinese, options: options('chinese', w) }))
  wSpeak.forEach(w => push({ type: 'speak', word: w, prompt: w.chinese, sub: w.pinyin, hint: w.vietnamese, answer: w.chinese }))
  const readTypes = ['zh2vi', 'vi2zh', 'zh2py', 'py2zh', 'cloze']
  wRead.forEach(w => {
    let type = readTypes[Math.floor(rnd() * readTypes.length)]
    if (type === 'cloze' && !(w.example_chinese && w.example_chinese.includes(w.chinese))) type = 'zh2vi'
    const base = { type, word: w }
    switch (type) {
      case 'zh2vi': return push({ ...base, prompt: w.chinese, sub: w.pinyin, answer: w.vietnamese, options: options('vietnamese', w) })
      case 'vi2zh': return push({ ...base, prompt: w.vietnamese, answer: w.chinese, options: options('chinese', w) })
      case 'zh2py': return push({ ...base, prompt: w.chinese, answer: w.pinyin, options: options('pinyin', w) })
      case 'py2zh': return push({ ...base, prompt: w.pinyin, answer: w.chinese, options: options('chinese', w) })
      default: return push({ ...base, prompt: w.example_chinese.replace(w.chinese, '＿＿'), answer: w.chinese, options: options('chinese', w) })
    }
  })
  wWrite.forEach(w => push({ type: 'write', word: w, prompt: w.vietnamese, sub: w.pinyin, answer: w.chinese }))
  return out
}

// ---- Kết quả: lưu bảng exam_results (db/07_exams.sql); chưa có bảng thì tạm lưu trong trình duyệt ----
const LS = 'ic_exam_results'
const local = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]') } catch { return [] } }

export async function saveResult(userId, r) {
  const row = { user_id: userId, ...r }
  const { error } = await supabase.from('exam_results').insert(row)
  if (error) {
    try { localStorage.setItem(LS, JSON.stringify([...local(), { ...row, created_at: new Date().toISOString() }].slice(-500))) } catch { /* đầy bộ nhớ */ }
  }
}

// { [số đề]: { best, count } } của một track
export async function loadResults(userId, track) {
  const { data } = await supabase.from('exam_results').select('exam_no,score').eq('user_id', userId).eq('track', track).limit(1000)
  const rows = [...(data || []), ...local().filter(x => x.user_id === userId && x.track === track)]
  const map = {}
  for (const x of rows) {
    const m = map[x.exam_no] || (map[x.exam_no] = { best: 0, count: 0 })
    m.best = Math.max(m.best, x.score); m.count++
  }
  return map
}

// Toàn bộ kết quả thi của một người (mọi track, cả bản lưu tạm trong trình duyệt) → { count, avg, best }
export async function examSummary(userId) {
  const { data } = await supabase.from('exam_results').select('score').eq('user_id', userId).limit(1000)
  const rows = [...(data || []), ...local().filter(x => x.user_id === userId)]
  if (!rows.length) return { count: 0, avg: null, best: null }
  return { count: rows.length, avg: Math.round(rows.reduce((t, x) => t + Number(x.score), 0) / rows.length), best: Math.max(...rows.map(x => Number(x.score))) }
}
