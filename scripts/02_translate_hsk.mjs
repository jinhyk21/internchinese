// Dịch nghĩa tiếng Việt + sinh câu ví dụ cho từ HSK bằng Gemini (free). Chạy lại được: bỏ qua id đã xong.
// Dùng: node scripts/02_translate_hsk.mjs [batchSize=50] [concurrency=3] [maxBatches=∞]
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const KEY = env.VITE_GEMINI_API_KEY
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest']
const cooldown = {} // model -> thời điểm được dùng lại (hết quota thì nghỉ lâu)
const BATCH = +process.argv[2] || 50, CONC = +process.argv[3] || 3, MAXB = +process.argv[4] || Infinity
const OUT = 'data/hsk_vi.jsonl'
const words = JSON.parse(fs.readFileSync('data/hsk_base.json', 'utf8'))
const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : [])
const todo = words.filter(w => !done.has(w.id))
const batches = []
for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
if (process.env.REVERSE) batches.reverse()
console.log(`còn ${todo.length} từ, ${batches.length} lô`)

const sleep = ms => new Promise(r => setTimeout(r, ms))
const prompt = (b) => `Bạn là giáo viên tiếng Trung cho sinh viên Việt Nam. Với mỗi từ HSK dưới đây, trả về JSON array, mỗi phần tử:
{"id":<id>,"vi":"nghĩa tiếng Việt ngắn gọn, chính xác (tối đa ~12 từ; nếu là từ Hán-Việt phổ biến thì thêm trong ngoặc, vd: 学习 → học tập)","ex":"1 câu ví dụ tiếng Trung tự nhiên, độ khó phù hợp cấp HSK của từ, có chứa đúng từ đó","exvi":"dịch câu ví dụ sang tiếng Việt"}
Chỉ trả JSON array, đủ ${b.length} phần tử, giữ nguyên id.
Danh sách:
${b.map(w => `${w.id}|${w.zh}|${w.py}|${w.level}|${w.en}`).join('\n')}`

async function call(b, attempt = 0) {
  const live = MODELS.filter(m => (cooldown[m] || 0) < Date.now())
  if (!live.length) { console.error('Tất cả model hết quota — dừng. Chạy lại sau.'); process.exit(2) }
  const model = live[attempt % live.length]
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(b) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }),
    })
    if (r.status === 429) {
      const t = await r.text()
      cooldown[model] = Date.now() + (/per day|PerDay/i.test(t) ? 6 * 3600e3 : 90e3)
      console.error(`[${model}] 429 → nghỉ`, /per day|PerDay/i.test(t) ? '6h (hết quota ngày)' : '90s')
      throw new Error('429')
    }
    if (r.status >= 500) throw new Error('HTTP ' + r.status)
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200))
    const j = await r.json()
    const arr = JSON.parse(j.candidates[0].content.parts[0].text)
    return arr.filter(x => x && x.id && x.vi)
  } catch (e) {
    if (attempt >= 12) throw e
    await sleep(e.message === '429' ? 1000 : 4000)
    return call(b, attempt + 1)
  }
}

let idx = 0, ok = 0, fail = 0
async function worker() {
  while (idx < Math.min(batches.length, MAXB)) {
    const b = batches[idx++]
    try {
      const res = await call(b)
      const ids = new Set(b.map(w => w.id))
      const lines = res.filter(x => ids.has(x.id)).map(x => JSON.stringify({ id: x.id, vi: String(x.vi).trim(), ex: x.ex ? String(x.ex).trim() : null, exvi: x.exvi ? String(x.exvi).trim() : null }))
      fs.appendFileSync(OUT, lines.join('\n') + '\n')
      ok += lines.length
    } catch (e) { fail += b.length; console.error('lô lỗi:', e.message) }
    if ((idx % 5) === 0) console.log(`tiến độ: lô ${idx}/${Math.min(batches.length, MAXB)}, xong ${ok}, lỗi ${fail}`)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))
console.log(`HOÀN TẤT lượt này: xong ${ok}, lỗi ${fail}`)
