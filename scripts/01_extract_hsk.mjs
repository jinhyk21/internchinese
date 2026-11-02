// Trích từ vựng HSK 3.0 (cấp 1–6 và 7-9) từ bộ dữ liệu mở complete-hsk-vocabulary
import fs from 'node:fs'
const src = JSON.parse(fs.readFileSync('data/_hsk_source.json', 'utf8'))
const LV = { n1: 'HSK 1', n2: 'HSK 2', n3: 'HSK 3', n4: 'HSK 4', n5: 'HSK 5', n6: 'HSK 6', n7: 'HSK 7-9' }
const out = []
const seen = new Set()
for (const w of src) {
  const lv = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'].find(l => w.l.includes(l))
  if (!lv || seen.has(w.s)) continue
  seen.add(w.s)
  const forms = w.f || []
  const f0 = forms[0]
  if (!f0) continue
  const meanings = [...new Set(forms.flatMap(f => f.m || []))].slice(0, 4)
  out.push({ zh: w.s, py: f0.i.y, en: meanings.join('; '), pos: (w.p || []).join(','), level: LV[lv], rank: w.q || 0 })
}
const order = Object.values(LV)
out.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level) || a.rank - b.rank)
out.forEach((w, i) => (w.id = i + 1))
fs.writeFileSync('data/hsk_base.json', JSON.stringify(out))
const c = {}; out.forEach(w => (c[w.level] = (c[w.level] || 0) + 1))
console.log(out.length, c)
