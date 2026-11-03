import { pinyin } from 'pinyin-pro'

// Chấm phát âm: so pinyin (kèm thanh điệu) của chữ máy nghe được với chữ chuẩn.
// Mỗi âm tiết: đúng âm + đúng thanh = 1 điểm · đúng âm sai thanh = 0.6 · sai âm = 0.
export const PRON_PASS = 60
const zhOnly = (s) => (s || '').replace(/[^一-鿿]/g, '')

function syllables(text) {
  const t = zhOnly(text)
  if (!t) return []
  const num = pinyin(t, { type: 'array', toneType: 'num', v: true })
  return [...t].map((ch, i) => {
    const m = /^([a-züv]+)([1-5])?$/i.exec(num[i] || '')
    return { ch, base: (m?.[1] || num[i] || '').toLowerCase(), tone: m?.[2] || '5' }
  })
}
const sim = (a, b) => (a.ch === b.ch ? 1 : a.base !== b.base ? 0 : a.tone === b.tone ? 1 : 0.6)

// Ghép tốt nhất hai chuỗi âm tiết (cho phép bỏ sót / thừa), trả về điểm từng âm tiết của câu mẫu.
function align(T, H) {
  const n = T.length, m = H.length
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1] + sim(T[i - 1], H[j - 1]))
  const got = Array(n).fill(0)
  for (let i = n, j = m; i > 0 && j > 0;) {
    const s = sim(T[i - 1], H[j - 1])
    if (s > 0 && dp[i][j] === dp[i - 1][j - 1] + s) { got[i - 1] = s; i--; j-- }
    else if (dp[i][j] === dp[i - 1][j]) i--
    else j--
  }
  return got
}

// target: chữ Hán chuẩn · heard: chữ máy nghe được → { score 0–100, parts:[{ch, py, s}], heard }
export function scorePronunciation(target, heard) {
  const T = syllables(target), H = syllables(heard)
  if (!T.length) return { score: 0, parts: [], heard: heard || '' }
  const got = H.length ? align(T, H) : T.map(() => 0)
  const sum = got.reduce((a, b) => a + b, 0)
  const score = Math.round(Math.min(1, sum / Math.max(T.length, H.length)) * 100)
  return { score, heard: heard || '', parts: T.map((t, i) => ({ ch: t.ch, py: pinyin(t.ch, { v: true }), s: got[i] })) }
}
export const pronLabel = (s) => (s >= 90 ? 'Xuất sắc' : s >= PRON_PASS ? 'Đạt' : s > 0 ? 'Cần luyện thêm' : 'Chưa nghe rõ')

// điểm cao nhất từng từ, lưu trong trình duyệt
const LS = 'ic_pron_best'
const read = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
export const bestPron = (id) => read()[id] ?? null
export function savePron(id, score) {
  const m = read()
  if (score > (m[id] ?? -1)) { m[id] = score; try { localStorage.setItem(LS, JSON.stringify(m)) } catch { /* đầy bộ nhớ */ } }
}
