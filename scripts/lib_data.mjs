import fs from 'node:fs'

export function loadAll() {
  const base = JSON.parse(fs.readFileSync('data/hsk_base.json', 'utf8'))
  const vi = new Map(fs.readFileSync('data/hsk_vi.jsonl', 'utf8').split('\n').filter(Boolean).map(l => { const o = JSON.parse(l); return [o.id, o] }))
  const hsk = base.filter(w => vi.has(w.id)).map(w => {
    const t = vi.get(w.id)
    return { chinese: w.zh, pinyin: w.py, vietnamese: t.vi, example_chinese: t.ex, example_pinyin: null, example_vietnamese: t.exvi, difficulty: w.level }
  })
  const ind = fs.existsSync('data/industry.json') ? JSON.parse(fs.readFileSync('data/industry.json', 'utf8')) : { categories: [], scenarios: {}, vocab: {} }
  return { hsk, ind }
}

import { pinyin as _py } from 'pinyin-pro'
// pinyin câu ví dụ: bỏ khoảng trắng thừa trước dấu câu
export const pyx = (s) => _py(s).replace(/\s+([。，！？、；：”’）》])/g, '$1').replace(/([“‘（《])\s+/g, '$1')
