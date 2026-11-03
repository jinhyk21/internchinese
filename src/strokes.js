// 12 nét cơ bản của chữ Hán. pts: đường mẫu trong khung 0–100 (y hướng xuống), theo đúng hướng viết.
export const STROKES = [
  { zh: '横', py: 'héng', vi: 'Nét ngang', how: 'Viết từ TRÁI sang PHẢI, hơi dốc lên một chút.', ex: '一 二 三 王', pts: [[14, 54], [50, 50], [86, 46]] },
  { zh: '竖', py: 'shù', vi: 'Nét sổ', how: 'Viết từ TRÊN xuống DƯỚI, thẳng đứng.', ex: '十 中 上 午', pts: [[50, 10], [50, 50], [50, 90]] },
  { zh: '撇', py: 'piě', vi: 'Nét phẩy', how: 'Viết từ trên-phải kéo xuống dưới-TRÁI, nhẹ dần ở cuối.', ex: '人 千 白 毛', pts: [[72, 12], [52, 45], [26, 88]] },
  { zh: '捺', py: 'nà', vi: 'Nét mác', how: 'Viết từ trên-trái kéo xuống dưới-PHẢI, đầu nét mảnh, cuối nét đậm.', ex: '人 大 天 木', pts: [[22, 14], [52, 52], [88, 88]] },
  { zh: '点', py: 'diǎn', vi: 'Nét chấm', how: 'Chấm ngắn, ấn từ trên xuống chếch sang phải.', ex: '主 六 办 衣', pts: [[42, 34], [50, 48], [58, 64]] },
  { zh: '提', py: 'tí', vi: 'Nét hất', how: 'Viết từ dưới-trái hất lên trên-PHẢI.', ex: '打 我 习 地', pts: [[18, 78], [50, 56], [84, 28]] },
  { zh: '横折', py: 'héngzhé', vi: 'Ngang gập', how: 'Viết ngang sang phải rồi gập xuống dưới.', ex: '口 日 四 国', pts: [[18, 24], [50, 24], [80, 24], [80, 55], [80, 88]] },
  { zh: '竖钩', py: 'shùgōu', vi: 'Sổ móc', how: 'Viết sổ xuống, cuối nét móc nhẹ sang TRÁI.', ex: '小 水 才 到', pts: [[56, 10], [56, 50], [56, 78], [40, 90]] },
  { zh: '横钩', py: 'hénggōu', vi: 'Ngang móc', how: 'Viết ngang sang phải rồi móc xuống chếch về TRÁI.', ex: '你 写 买 宁', pts: [[14, 34], [48, 34], [80, 34], [70, 54]] },
  { zh: '竖提', py: 'shùtí', vi: 'Sổ hất', how: 'Viết sổ xuống rồi hất chếch lên PHẢI.', ex: '良 以 民 长', pts: [[34, 10], [34, 50], [34, 80], [70, 56]] },
  { zh: '撇折', py: 'piězhé', vi: 'Phẩy gập', how: 'Phẩy xuống trái rồi gập chếch sang PHẢI.', ex: '去 么 参 红', pts: [[66, 12], [46, 36], [28, 56], [76, 64]] },
  { zh: '竖折', py: 'shùzhé', vi: 'Sổ gập', how: 'Viết sổ xuống rồi gập ngang sang PHẢI.', ex: '山 母 出 世', pts: [[28, 12], [28, 50], [28, 84], [62, 84], [86, 84]] },
]

const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
function length(p) { let t = 0; for (let i = 1; i < p.length; i++) t += d(p[i - 1], p[i]); return t }
function resample(p, n = 24) {
  const L = [0]; for (let i = 1; i < p.length; i++) L[i] = L[i - 1] + d(p[i - 1], p[i])
  const T = L[L.length - 1]
  if (!T) return Array(n).fill(p[0])
  const out = []; let j = 1
  for (let k = 0; k < n; k++) {
    const t0 = T * k / (n - 1)
    while (j < p.length - 1 && L[j] < t0) j++
    const seg = L[j] - L[j - 1] || 1, t = (t0 - L[j - 1]) / seg
    out.push([p[j - 1][0] + (p[j][0] - p[j - 1][0]) * t, p[j - 1][1] + (p[j][1] - p[j - 1][1]) * t])
  }
  return out
}
const center = (p) => { const c = p.reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]).map(v => v / p.length); return p.map(q => [q[0] - c[0], q[1] - c[1]]) }
const mean = (a, b) => a.reduce((s, q, i) => s + d(q, b[i]), 0) / a.length

// So nét người dùng vẽ (toạ độ 0–100) với nét mẫu: cùng hình dạng, cùng hướng, độ dài tương đương. Không phụ thuộc vị trí đặt nét.
export function judgeStroke(user, tpl) {
  if (user.length < 2 || length(user) < 4) return { ok: false, msg: 'Nét quá ngắn — hãy kéo bút dài hơn.' }
  const u = center(resample(user)), t = center(resample(tpl))
  const ratio = length(user) / length(tpl)
  if (mean(u, t) <= 15 && ratio > 0.5 && ratio < 1.8) return { ok: true, msg: 'Chuẩn! Nét viết đúng hình và đúng hướng.' }
  if (mean(u, [...t].reverse()) <= 15) return { ok: false, msg: 'Sai hướng — nét này viết theo chiều ngược lại (xem mũi tên).' }
  if (ratio <= 0.5) return { ok: false, msg: 'Nét hơi ngắn so với mẫu.' }
  if (ratio >= 1.8) return { ok: false, msg: 'Nét hơi dài so với mẫu.' }
  return { ok: false, msg: 'Chưa giống mẫu — viết chậm, bám theo đường nét và mũi tên.' }
}
