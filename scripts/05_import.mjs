// Nhập dữ liệu trực tiếp qua API bằng tài khoản ADMIN (không cần SQL Editor).
// Dùng: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/05_import.mjs
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { pinyin } from 'pinyin-pro'
import { loadAll, pyx } from './lib_data.mjs'

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
const { error: e0 } = await sb.auth.signInWithPassword({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
if (e0) throw e0
const { data: me } = await sb.from('profiles').select('role').single()
if (me.role !== 'admin') throw new Error('Tài khoản này không phải admin')

const { hsk, ind } = loadAll()
const must = (r, what) => { if (r.error) throw new Error(what + ': ' + r.error.message); return r.data }
const all = async (table, cols) => { let out = [], from = 0; for (;;) { const d = must(await sb.from(table).select(cols).range(from, from + 999), table); out = out.concat(d); if (d.length < 1000) return out; from += 1000 } }

// chuẩn hóa độ khó cũ
for (const [a, b] of [['beginner', 'HSK 2'], ['intermediate', 'HSK 4'], ['advanced', 'HSK 6']]) must(await sb.from('vocabulary').update({ difficulty: b }).eq('difficulty', a), 'difficulty')

// ngành
const haveCats = await all('categories', 'id,name')
for (const c of ind.categories || []) if (!haveCats.find(x => x.name === c.name))
  must(await sb.from('categories').insert({ name: c.name, name_zh: c.zh, description: c.desc, icon: c.icon, display_order: c.order }), 'categories')
const cats = await all('categories', 'id,name')
const catId = Object.fromEntries(cats.map(c => [c.name, c.id]))

// tình huống
const haveSc = new Set((await all('scenarios', 'title')).map(x => x.title))
const newSc = Object.entries(ind.scenarios).flatMap(([cat, l]) => l.filter(s => !haveSc.has(s.title)).map(s => ({
  category_id: catId[cat], title: s.title, title_zh: s.title_zh, description: s.description, situation: s.situation,
  learning_objectives: s.learning_objectives, difficulty: s.difficulty, estimated_minutes: s.estimated_minutes, ai_role: s.ai_role,
  ai_role_zh: s.ai_role_zh, ai_personality: s.ai_personality, initial_message: s.initial_message, suggested_phrases: s.suggested_phrases, is_published: true })))
for (let i = 0; i < newSc.length; i += 100) must(await sb.from('scenarios').insert(newSc.slice(i, i + 100)), 'scenarios')
console.log('tình huống mới:', newSc.length)

// từ vựng
const haveV = new Set((await all('vocabulary', 'chinese')).map(x => x.chinese))
const rows = []
for (const [cat, l] of Object.entries(ind.vocab)) for (const w of l) if (!haveV.has(w.zh)) { haveV.add(w.zh); rows.push({ category_id: catId[cat], chinese: w.zh, pinyin: w.py, vietnamese: w.vi, example_chinese: w.ex, example_pinyin: w.ex ? pyx(w.ex) : null, example_vietnamese: w.exvi, difficulty: w.level }) }
for (const w of hsk) if (!haveV.has(w.chinese)) { haveV.add(w.chinese); rows.push({ ...w, example_pinyin: w.example_chinese ? pyx(w.example_chinese) : null }) }
for (let i = 0; i < rows.length; i += 500) { must(await sb.from('vocabulary').insert(rows.slice(i, i + 500)), 'vocabulary'); process.stdout.write(`\rtừ vựng ${Math.min(i + 500, rows.length)}/${rows.length}`) }
console.log('\nHOÀN TẤT')
