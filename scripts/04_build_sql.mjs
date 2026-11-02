// Xuất SQL từ data/ vào db/. Các file chạy theo thứ tự số trong Supabase SQL Editor.
import fs from 'node:fs'
import { pinyin } from 'pinyin-pro'
import { loadAll, pyx } from './lib_data.mjs'

const { hsk, ind } = loadAll()
fs.mkdirSync('db', { recursive: true })
for (const f of fs.readdirSync('db')) if (f.endsWith('.sql')) fs.unlinkSync('db/' + f)

const q = s => s == null ? 'NULL' : `$q$${String(s).replace(/\$q\$/g, '')}$q$`
const arr = a => `ARRAY[${a.map(q).join(',')}]::text[]`
const write = (n, s) => { fs.writeFileSync('db/' + n, s); console.log(n, (s.length / 1024).toFixed(0) + ' KB') }

write('00_prepare.sql', `-- Chuẩn bị: index + chuẩn hóa độ khó cũ sang cấp HSK
CREATE INDEX IF NOT EXISTS idx_vocab_chinese ON public.vocabulary(chinese);
CREATE INDEX IF NOT EXISTS idx_vocab_difficulty ON public.vocabulary(difficulty);
UPDATE public.vocabulary SET difficulty = CASE difficulty WHEN 'beginner' THEN 'HSK 2' WHEN 'intermediate' THEN 'HSK 4' WHEN 'advanced' THEN 'HSK 6' ELSE difficulty END
WHERE difficulty IN ('beginner','intermediate','advanced');
`)

// ngành mới + tình huống
const cats = ind.categories || []
let s = `-- Ngành mới\nINSERT INTO public.categories (name, name_zh, description, icon, display_order)\nSELECT v.n, v.z, v.d, v.i, v.o FROM (VALUES\n` +
  cats.map(c => `(${q(c.name)}, ${q(c.zh)}, ${q(c.desc)}, ${q(c.icon)}, ${c.order})`).join(',\n') +
  `\n) AS v(n,z,d,i,o) WHERE NOT EXISTS (SELECT 1 FROM public.categories x WHERE x.name = v.n);\n`
write('01_categories.sql', s)

const sc = Object.entries(ind.scenarios).flatMap(([cat, list]) => list.map(x => ({ cat, ...x })))
for (let i = 0, part = 1; i < sc.length; i += 24, part++) {
  const chunk = sc.slice(i, i + 24)
  write(`02_scenarios_${part}.sql`, `-- Tình huống (phần ${part})
INSERT INTO public.scenarios (category_id, title, title_zh, description, situation, learning_objectives, difficulty, estimated_minutes, ai_role, ai_role_zh, ai_personality, initial_message, suggested_phrases, is_published)
SELECT c.id, s.title, s.title_zh, s.description, s.situation, s.obj, s.diff, s.mins, s.ai_role, s.ai_role_zh, s.pers, s.init, s.phr::jsonb, TRUE
FROM (VALUES
${chunk.map(x => `(${q(x.cat)}, ${q(x.title)}, ${q(x.title_zh)}, ${q(x.description)}, ${q(x.situation)}, ${arr(x.learning_objectives)}, ${q(x.difficulty)}, ${x.estimated_minutes}, ${q(x.ai_role)}, ${q(x.ai_role_zh)}, ${q(x.ai_personality)}, ${q(x.initial_message)}, ${q(JSON.stringify(x.suggested_phrases))})`).join(',\n')}
) AS s(cat, title, title_zh, description, situation, obj, diff, mins, ai_role, ai_role_zh, pers, init, phr)
JOIN public.categories c ON c.name = s.cat
WHERE NOT EXISTS (SELECT 1 FROM public.scenarios x WHERE x.title = s.title);
`)
}

const vrow = (w, cat) => `(${cat ? q(cat) + ', ' : ''}${q(w.chinese)}, ${q(w.pinyin)}, ${q(w.vietnamese)}, ${q(w.example_chinese)}, ${q(w.example_pinyin)}, ${q(w.example_vietnamese)}, ${q(w.difficulty)})`
const indWords = Object.entries(ind.vocab).flatMap(([cat, l]) => l.map(w => ({ cat, chinese: w.zh, pinyin: w.py, vietnamese: w.vi, example_chinese: w.ex, example_pinyin: w.ex ? pyx(w.ex) : null, example_vietnamese: w.exvi, difficulty: w.level })))
for (let i = 0, part = 1; i < indWords.length; i += 300, part++) {
  write(`03_vocab_industry_${part}.sql`, `-- Từ vựng theo ngành (phần ${part})
INSERT INTO public.vocabulary (category_id, chinese, pinyin, vietnamese, example_chinese, example_pinyin, example_vietnamese, difficulty)
SELECT c.id, v.zh, v.py, v.vi, v.ex, v.exp, v.exv, v.diff FROM (VALUES
${indWords.slice(i, i + 300).map(w => vrow(w, w.cat)).join(',\n')}
) AS v(cat, zh, py, vi, ex, exp, exv, diff)
JOIN public.categories c ON c.name = v.cat
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary x WHERE x.chinese = v.zh);
`)
}

const hskRows = hsk.map(w => ({ ...w, example_pinyin: w.example_chinese ? pyx(w.example_chinese) : null }))
for (let i = 0, part = 1; i < hskRows.length; i += 1000, part++) {
  write(`04_vocab_hsk_${String(part).padStart(2, '0')}.sql`, `-- Từ vựng HSK (phần ${part}: ${hskRows[i].difficulty} …)
INSERT INTO public.vocabulary (chinese, pinyin, vietnamese, example_chinese, example_pinyin, example_vietnamese, difficulty)
SELECT v.zh, v.py, v.vi, v.ex, v.exp, v.exv, v.diff FROM (VALUES
${hskRows.slice(i, i + 1000).map(w => vrow(w)).join(',\n')}
) AS v(zh, py, vi, ex, exp, exv, diff)
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary x WHERE x.chinese = v.zh);
`)
}
console.log({ hsk: hskRows.length, industryWords: indWords.length, scenarios: sc.length, categories: cats.length })
