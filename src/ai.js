import { pinyin } from 'pinyin-pro'

const KEY = import.meta.env.VITE_GEMINI_API_KEY
// Gói free giới hạn theo từng model → xoay vòng; model nào hết quota thì nghỉ một lúc
const MODELS = (import.meta.env.VITE_GEMINI_MODEL ? [import.meta.env.VITE_GEMINI_MODEL] : []).concat(
  ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash'])
const cooldown = {}

export async function gemini(system, contents) {
  let last
  for (const model of MODELS) {
    if ((cooldown[model] || 0) > Date.now()) continue
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      })
      if (r.status === 429 || r.status >= 500) { cooldown[model] = Date.now() + 90e3; last = new Error(`Gemini ${r.status}`); continue }
      if (!r.ok) { last = new Error(`Gemini ${r.status}`); continue }
      const j = await r.json()
      return JSON.parse(j.candidates[0].content.parts[0].text)
    } catch (e) { last = e }
  }
  throw last || new Error('Gemini không khả dụng')
}

const persona = (s, level) =>
  `Bạn đang đóng vai "${s.ai_role_zh} (${s.ai_role})" trong tình huống thực tập tại công ty Trung Quốc.
Tình huống: ${s.situation}. Tính cách: ${s.ai_personality || 'tự nhiên, chuyên nghiệp'}.
Học viên trình độ ${level}; nói tiếng Trung đơn giản, 1-2 câu.`

// ---------- Bộ luật nội bộ (không cần key) ----------
const hasZh = (t) => /[一-鿿]/.test(t)
const R = (reply, vi) => ({ reply, pinyin: pinyin(reply), vi })

const RULES = [
  [/再说|听不懂|不懂|不明白/, () => R('没关系，我再说一遍，你慢慢听。', 'Không sao, tôi nói lại, bạn cứ nghe từ từ.')],
  [/谢谢|感谢/, () => R('不客气！你做得很好。', 'Không có gì! Bạn làm rất tốt.')],
  [/对不起|不好意思|抱歉/, () => R('没关系，下次注意就好。', 'Không sao, lần sau chú ý là được.')],
  [/我叫|我是|自我介绍|名字/, () => R('很高兴认识你！你是哪所大学的？学什么专业？', 'Rất vui được gặp bạn! Bạn học trường nào, ngành gì?')],
  [/大学|专业|学生|学校/, () => R('不错。你为什么想来我们公司实习？', 'Khá tốt. Vì sao bạn muốn thực tập ở công ty chúng tôi?')],
  [/经验|经历|实习/, () => R('你有相关的工作经验吗？可以简单说一下吗？', 'Bạn có kinh nghiệm liên quan không? Nói sơ qua được không?')],
  [/订单|数量|确认/, () => R('好的，数量是一千件，请你再确认一下。', 'Được, số lượng là 1000 chiếc, bạn xác nhận lại nhé.')],
  [/发货|交货|运输|时间/, () => R('预计下周三发货，可以吗？', 'Dự kiến thứ Tư tuần sau giao hàng, được không?')],
  [/价格|多少钱|优惠|折扣/, () => R('这个产品一件一百元，数量多可以优惠。', 'Sản phẩm này 100 tệ/chiếc, số lượng nhiều có thể giảm giá.')],
  [/产品|特点|功能/, () => R('听起来不错。它和别的产品有什么不同？', 'Nghe không tệ. Nó khác các sản phẩm khác ở điểm nào?')],
  [/完成|已经|进展|进度/, () => R('很好。有没有遇到什么困难？', 'Tốt. Có gặp khó khăn gì không?')],
  [/问题|困难|麻烦/, () => R('明白了。你有什么解决的办法吗？', 'Tôi hiểu rồi. Bạn có cách giải quyết nào không?')],
  [/办法|建议|方案|解决/, () => R('这个办法可以，那就按你说的做吧。', 'Cách này được, cứ làm theo lời bạn nói.')],
  [/你好|您好|早上好|下午好/, () => R('你好！请问有什么可以帮你的？', 'Xin chào! Có gì tôi giúp được bạn không?')],
]
const FOLLOW = [
  R('嗯，我明白了。请再详细说一说。', 'Ừm, tôi hiểu rồi. Bạn hãy nói chi tiết hơn.'),
  R('好的，然后呢？', 'Vâng, sau đó thì sao?'),
  R('你的想法很有意思，还有别的吗？', 'Ý tưởng của bạn khá thú vị, còn gì nữa không?'),
]

function localChat(history) {
  const last = [...history].reverse().find(m => m.sender === 'user')?.content || ''
  if (!hasZh(last)) return R('请用中文说，我们再试一次。', 'Hãy nói bằng tiếng Trung, chúng ta thử lại nhé.')
  const hit = RULES.find(([re]) => re.test(last))
  if (hit) return hit[1]()
  return FOLLOW[history.length % FOLLOW.length]
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

function localEvaluate(scenario, history) {
  const mine = history.filter(m => m.sender === 'user').map(m => m.content)
  const zh = mine.filter(hasZh)
  const chars = zh.join('').replace(/[^一-鿿]/g, '').length
  const avg = zh.length ? chars / zh.length : 0
  const phrases = (scenario.suggested_phrases || []).map(p => p.zh.replace(/[.…。，,]/g, ''))
  const usedPhrase = zh.filter(t => phrases.some(p => p && t.includes(p.slice(0, 4)))).length
  const polite = zh.filter(t => /请|您|谢谢|不好意思|麻烦/.test(t)).length
  const uniq = new Set(zh.join('').replace(/[^一-鿿]/g, '')).size

  const grammar = 55 + Math.min(25, avg * 2.5) + (zh.length / Math.max(mine.length, 1)) * 15
  const vocab = 45 + Math.min(35, uniq * 1.2) + usedPhrase * 5
  const fluency = 45 + Math.min(30, mine.length * 6) + Math.min(15, avg)
  const comm = 50 + Math.min(25, polite * 10) + Math.min(20, mine.length * 4)
  const pron = (grammar + fluency) / 2
  const overall = (grammar + vocab + fluency + comm + pron) / 5

  const strengths = [], weaknesses = [], recommendations = []
  if (polite) strengths.push('Biết dùng từ lịch sự (请/您/谢谢) đúng môi trường công sở.')
  if (avg >= 8) strengths.push('Câu nói đủ dài, diễn đạt tương đối đầy đủ ý.')
  if (usedPhrase) strengths.push('Vận dụng được các câu mẫu của tình huống.')
  if (mine.length >= 4) strengths.push('Duy trì hội thoại tốt, trả lời đều đặn.')
  if (!strengths.length) strengths.push('Đã hoàn thành buổi luyện tập, hãy tiếp tục phát huy.')
  if (avg < 6) { weaknesses.push('Câu còn ngắn, thiếu chi tiết.'); recommendations.push('Thử nói câu dài hơn: thêm lý do hoặc ví dụ (因为…所以…).') }
  if (!polite) { weaknesses.push('Chưa dùng từ lịch sự.'); recommendations.push('Thêm 请, 您, 麻烦您 khi nói với cấp trên hoặc khách hàng.') }
  if (mine.length < 3) { weaknesses.push('Số lượt nói còn ít.'); recommendations.push('Luyện thêm để có hội thoại dài hơn 4-5 lượt.') }
  recommendations.push('Ôn lại từ vựng ngành trong mục Từ vựng trước khi luyện lại.')

  const corrections = mine.filter(t => !hasZh(t)).map(t => ({
    original: t, corrected: '(hãy diễn đạt bằng tiếng Trung)', explanation: 'Câu này không có chữ Hán; hãy luyện nói hoàn toàn bằng tiếng Trung.',
  }))

  return {
    overall_score: clamp(overall), pronunciation_score: clamp(pron), grammar_score: clamp(grammar),
    vocabulary_score: clamp(vocab), fluency_score: clamp(fluency), communication_score: clamp(comm),
    strengths, weaknesses, corrections, recommendations,
    summary: 'Đánh giá tự động theo độ dài câu, từ vựng, mức lịch sự và số lượt hội thoại (chưa dùng AI Gemini).',
  }
}

// ---------- API ----------
export const aiMode = KEY ? 'gemini' : 'local'

export async function aiChat(scenario, level, history) {
  if (KEY) {
    try {
      const out = await gemini(
        persona(scenario, level) + '\nChỉ trả JSON: {"reply":"tiếng Trung","pinyin":"pinyin","vi":"dịch tiếng Việt"}',
        history.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))
      )
      return out
    } catch { /* quota/lỗi mạng → dùng bộ luật nội bộ */ }
  }
  return localChat(history)
}

export async function aiEvaluate(scenario, level, history) {
  if (KEY) {
    try {
      const transcript = history.map(m => `${m.sender === 'user' ? 'HỌC VIÊN' : 'AI'}: ${m.content}`).join('\n')
      return await gemini(
        `Bạn là giáo viên tiếng Trung. Chấm các câu của HỌC VIÊN, tình huống: ${scenario.situation}, trình độ ${level}. Trả JSON:
{"overall_score":0-100,"pronunciation_score":0-100,"grammar_score":0-100,"vocabulary_score":0-100,"fluency_score":0-100,"communication_score":0-100,"strengths":["vi"],"weaknesses":["vi"],"corrections":[{"original":"","corrected":"","explanation":"vi"}],"recommendations":["vi"],"summary":"vi"}`,
        [{ role: 'user', parts: [{ text: transcript }] }]
      )
    } catch { /* fallthrough */ }
  }
  return localEvaluate(scenario, history)
}

// ---------- Dịch Trung ⇄ Việt (cần Gemini) ----------
// dir: 'zh-vi' | 'vi-zh'. Trả null nếu không có key hoặc Gemini lỗi.
export async function aiTranslate(text, dir) {
  if (!KEY) return null
  const [from, to] = dir === 'zh-vi' ? ['tiếng Trung', 'tiếng Việt'] : ['tiếng Việt', 'tiếng Trung giản thể']
  try {
    const out = await gemini(
      `Bạn là phiên dịch viên chuyên nghiệp ${from} → ${to}, ngữ cảnh công sở/thực tập tại công ty Trung Quốc. Dịch tự nhiên, đúng sắc thái lịch sự.
Chỉ trả JSON: {"translation":"bản dịch","alternatives":["tối đa 2 cách nói khác, nếu có"],"note":"ghi chú ngắn về cách dùng/sắc thái, BẮT BUỘC viết bằng tiếng Việt, để trống nếu không cần"}\nQuy tắc: translation và alternatives chỉ chứa đúng ngôn ngữ đích (không kèm giải thích); mọi giải thích đặt trong note.`,
      [{ role: 'user', parts: [{ text }] }])
    return out?.translation ? out : null
  } catch { return null }
}
