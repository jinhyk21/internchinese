// Sinh tình huống + từ vựng chuyên ngành bằng Gemini. Pinyin luôn tạo bằng pinyin-pro (không tin model).
// Kết quả: data/industry.json  (chạy lại được — bỏ qua phần đã sinh)
import fs from 'node:fs'
import { pinyin } from 'pinyin-pro'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const KEY = env.VITE_GEMINI_API_KEY
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']
const cooldown = {}
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ngành cũ cần +4 tình huống (đang có 4), ngành mới cần 8
const CATS = [
  { name: 'Văn phòng - Hành chính', zh: '办公室与行政', sc: 4, old: true },
  { name: 'Kinh doanh - Bán hàng', zh: '商务与销售', sc: 4, old: true },
  { name: 'Xuất nhập khẩu', zh: '进出口贸易', sc: 4, old: true },
  { name: 'Du lịch - Dịch vụ', zh: '旅游与服务', sc: 4, old: true },
  { name: 'Nhân sự', zh: '人力资源', sc: 4, old: true },
  { name: 'Sản xuất - Nhà máy', zh: '生产与工厂', sc: 4, old: true },
  { name: 'Công nghệ thông tin', zh: '信息技术', sc: 8, icon: 'laptop', desc: 'Giao tiếp với đội kỹ thuật: lỗi hệ thống, họp sprint, hỗ trợ người dùng, bảo mật.', order: 7 },
  { name: 'Tài chính - Kế toán', zh: '财务与会计', sc: 8, icon: 'calculator', desc: 'Hóa đơn, thanh toán, báo cáo thu chi, đối chiếu công nợ, thuế.', order: 8 },
  { name: 'Marketing - Truyền thông', zh: '市场营销与传媒', sc: 8, icon: 'megaphone', desc: 'Lên kế hoạch chiến dịch, nội dung mạng xã hội, quảng cáo, phân tích khách hàng.', order: 9 },
  { name: 'Logistics - Kho vận', zh: '物流与仓储', sc: 8, icon: 'truck', desc: 'Nhập xuất kho, theo dõi vận chuyển, kiểm đếm hàng hóa, giao nhận.', order: 10 },
  { name: 'Giáo dục - Đào tạo', zh: '教育与培训', sc: 8, icon: 'book', desc: 'Hỗ trợ lớp học, tư vấn khóa học, liên lạc phụ huynh, tổ chức sự kiện đào tạo.', order: 11 },
  { name: 'Y tế - Dược phẩm', zh: '医疗与医药', sc: 8, icon: 'heart', desc: 'Tiếp đón bệnh nhân, hỏi triệu chứng cơ bản, hướng dẫn thủ tục, tư vấn thuốc.', order: 12 },
]
const VOCAB_PER_CAT = 60

async function ask(text, attempt = 0) {
  const live = MODELS.filter(m => (cooldown[m] || 0) < Date.now())
  if (!live.length) { console.error('Hết quota tất cả model — dừng, chạy lại sau.'); process.exit(2) }
  const model = live[attempt % live.length]
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } }),
    })
    if (r.status === 429) {
      const t = await r.text(); cooldown[model] = Date.now() + (/per day|PerDay/i.test(t) ? 6 * 3600e3 : 90e3); throw new Error('429')
    }
    if (r.status >= 500) throw new Error('HTTP ' + r.status)
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200))
    return JSON.parse((await r.json()).candidates[0].content.parts[0].text)
  } catch (e) {
    if (attempt >= 12) throw e
    await sleep(e.message === '429' ? 1000 : 4000); return ask(text, attempt + 1)
  }
}

const scenarioPrompt = (c, n, existing) => `Tạo ${n} tình huống giao tiếp tiếng Trung cho sinh viên Việt Nam đi thực tập tại công ty Trung Quốc, ngành "${c.name}" (${c.zh}).
Các tình huống phải KHÁC NHAU, thực tế, đa dạng bối cảnh (nội bộ, với khách hàng, với đối tác, với cấp trên), trải đều 3 độ khó. Không trùng các tình huống đã có: ${existing.join('; ') || '(chưa có)'}.
Trả JSON array, mỗi phần tử có đúng các trường:
{"title":"tiêu đề tiếng Việt","title_zh":"tiêu đề tiếng Trung ngắn","description":"1 câu mô tả tiếng Việt","situation":"2-3 câu mô tả bối cảnh tiếng Việt, ngôi thứ hai (Bạn ...)","learning_objectives":["3 mục tiêu tiếng Việt"],"difficulty":"beginner|intermediate|advanced","estimated_minutes":10-20,"ai_role":"vai AI tiếng Việt","ai_role_zh":"vai AI tiếng Trung","ai_personality":"1 câu tiếng Việt về tính cách/thái độ","initial_message":"câu mở đầu của AI bằng tiếng Trung, 1-2 câu, tự nhiên, đúng trình độ","suggested_phrases":[{"zh":"câu tiếng Trung hữu ích","vi":"dịch tiếng Việt"} x4]}`

const vocabPrompt = (c, n, skip) => `Liệt kê ${n} từ/cụm từ tiếng Trung THỰC DỤNG nhất cho sinh viên thực tập ngành "${c.name}" (${c.zh}) tại công ty Trung Quốc: thuật ngữ chuyên ngành, từ dùng hằng ngày nơi làm việc, cụm giao tiếp. Đa dạng cấp độ. Tránh các từ đã có: ${skip.slice(0, 80).join(', ')}.
Trả JSON array, mỗi phần tử:
{"zh":"từ tiếng Trung giản thể (2-6 chữ)","vi":"nghĩa tiếng Việt ngắn gọn","ex":"1 câu ví dụ tiếng Trung tự nhiên có chứa từ","exvi":"dịch câu ví dụ","level":"HSK 1|HSK 2|HSK 3|HSK 4|HSK 5|HSK 6|HSK 7-9 (ước lượng cấp độ khó)"}`

const OUT = 'data/industry.json'
const db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { categories: CATS.filter(c => !c.old), scenarios: {}, vocab: {} }
const save = () => fs.writeFileSync(OUT, JSON.stringify(db, null, 1))
const hsk = JSON.parse(fs.readFileSync('data/hsk_base.json', 'utf8'))
const taken = new Set(hsk.map(w => w.zh))
const LV = new Set(['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'HSK 7-9'])
const DIFF = new Set(['beginner', 'intermediate', 'advanced'])
const okScenario = s => s?.title && s.title_zh && s.situation && s.initial_message && DIFF.has(s.difficulty) &&
  Array.isArray(s.learning_objectives) && s.learning_objectives.length >= 2 && Array.isArray(s.suggested_phrases) && s.suggested_phrases.length >= 2 &&
  s.suggested_phrases.every(p => p.zh && p.vi) && /[一-鿿]/.test(s.initial_message)

async function runCat(c) {
  // tình huống
  const have = db.scenarios[c.name] || []
  const titles = [...have.map(s => s.title)]
  while (have.length < c.sc) {
    const need = Math.min(4, c.sc - have.length)
    const arr = (await ask(scenarioPrompt(c, need, titles))).filter(okScenario)
    for (const s of arr) if (!titles.includes(s.title) && have.length < c.sc) { have.push({ ...s, estimated_minutes: Math.min(20, Math.max(8, +s.estimated_minutes || 12)) }); titles.push(s.title) }
    db.scenarios[c.name] = have; save()
  }
  // từ vựng
  const words = db.vocab[c.name] || []
  const seen = new Set(words.map(w => w.zh))
  let guard = 0
  while (words.length < VOCAB_PER_CAT && guard++ < 6) {
    const arr = await ask(vocabPrompt(c, 30, words.map(w => w.zh)))
    for (const w of arr) {
      if (!w?.zh || !w.vi || !/^[一-鿿]{1,8}$/.test(w.zh) || seen.has(w.zh) || taken.has(w.zh)) continue
      seen.add(w.zh); words.push({ zh: w.zh, py: pinyin(w.zh), vi: String(w.vi).trim(), ex: w.ex || null, exvi: w.exvi || null, level: LV.has(w.level) ? w.level : 'HSK 4' })
    }
    db.vocab[c.name] = words; save()
  }
  console.log(c.name, '→ tình huống', (db.scenarios[c.name] || []).length, '· từ vựng', words.length)
}

const queue = [...CATS]
await Promise.all([0, 1, 2].map(async () => { while (queue.length) { const c = queue.shift(); try { await runCat(c) } catch (e) { console.error('LỖI', c.name, e.message) } } }))
console.log('xong')
