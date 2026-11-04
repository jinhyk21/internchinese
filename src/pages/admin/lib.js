import { supabase } from '../../supabase'

// Supabase giới hạn 1000 dòng/lần → lấy tuần tự theo trang
export async function pageAll(table, cols = '*') {
  let out = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999)
    if (error) return { data: out, error }
    out = out.concat(data || [])
    if (!data || data.length < 1000) return { data: out }
    from += 1000
  }
}

export async function countOf(table, build) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (build) q = build(q)
  const { count } = await q
  return count || 0
}

// Lấy hồ sơ theo danh sách id (bảng khác không có FK tới profiles nên không nhúng được)
export async function profilesById(ids) {
  const uniq = [...new Set(ids.filter(Boolean))]
  const map = {}
  for (let i = 0; i < uniq.length; i += 100) {
    const { data } = await supabase.from('profiles').select('*').in('id', uniq.slice(i, i + 100))
    ;(data || []).forEach(p => { map[p.id] = p })
  }
  return map
}

export const DAY = 86400000
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
export const fmtTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—'
export const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN')
export const avg = (l, f = x => x) => l.length ? l.reduce((t, x) => t + Number(f(x) || 0), 0) / l.length : 0
export const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
export const scoreCls = (s) => s >= 80 ? 'good' : s >= 60 ? 'mid' : 'low'
export const nameOf = (p) => p?.full_name || p?.email || 'Ẩn danh'

// ---- CSV
export function toCSV(rows, cols) {
  const esc = (v) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n')
}
export function downloadCSV(name, text) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  a.download = name; a.click(); URL.revokeObjectURL(a.href)
}
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = [] }
    else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some(x => x !== '')) rows.push(row) }
  const [head, ...body] = rows
  return (head ? body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? '']))) : [])
}

// Cấu hình bảng nội dung
export const TABLES = {
  categories: { label: 'Ngành', zh: '行业', title: 'name', search: ['name', 'name_zh'], fields: [['name', 'Tên'], ['name_zh', 'Tên (中文)'], ['description', 'Mô tả'], ['icon', 'Icon'], ['display_order', 'Thứ tự', 'number'], ['is_active', 'Hiển thị', 'bool']], flag: 'is_active', cols: ['name', 'name_zh', 'display_order'] },
  scenarios: { label: 'Tình huống', zh: '情景', title: 'title', search: ['title', 'title_zh'], fields: [['title', 'Tiêu đề'], ['title_zh', 'Tiêu đề (中文)'], ['description', 'Mô tả'], ['situation', 'Bối cảnh', 'area'], ['difficulty', 'Độ khó', ['beginner', 'intermediate', 'advanced']], ['estimated_minutes', 'Số phút', 'number'], ['ai_role', 'Vai AI'], ['ai_role_zh', 'Vai AI (中文)'], ['ai_personality', 'Tính cách AI', 'area'], ['initial_message', 'Câu mở đầu'], ['learning_objectives', 'Mục tiêu (mỗi dòng 1 mục)', 'lines'], ['suggested_phrases', 'Câu gợi ý (JSON)', 'json'], ['category_id', 'Ngành', 'cat'], ['is_published', 'Xuất bản', 'bool']], flag: 'is_published', cols: ['title', 'title_zh', 'difficulty', 'estimated_minutes'] },
  vocabulary: { label: 'Từ vựng', zh: '词汇', title: 'chinese', search: ['chinese', 'pinyin', 'vietnamese'], fields: [['chinese', '中文'], ['pinyin', 'Pinyin'], ['vietnamese', 'Tiếng Việt'], ['example_chinese', 'Ví dụ'], ['example_pinyin', 'Ví dụ pinyin'], ['example_vietnamese', 'Ví dụ tiếng Việt'], ['difficulty', 'Độ khó', ['beginner', 'intermediate', 'advanced']], ['category_id', 'Ngành', 'cat']], cols: ['chinese', 'pinyin', 'vietnamese', 'difficulty'] },
}
