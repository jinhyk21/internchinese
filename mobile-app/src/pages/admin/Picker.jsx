import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { nameOf } from './lib.js'

// Chọn một bản ghi bằng cách gõ tìm: table = 'profiles' | 'vocabulary'
export default function Picker({ table, value, onChange, placeholder }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState([])
  const label = (r) => table === 'profiles' ? `${nameOf(r)}${r.email ? ` · ${r.email}` : ''}` : `${r.chinese} — ${r.vietnamese}`
  const cols = table === 'profiles' ? ['full_name', 'email', 'student_code'] : ['chinese', 'vietnamese', 'pinyin']

  useEffect(() => {
    const needle = q.replace(/[,()%*\\]/g, ' ').trim()
    const t = setTimeout(async () => {
      let query = supabase.from(table).select('*').limit(15)
      if (needle) query = query.or(cols.map(c => `${c}.ilike.%${needle}%`).join(','))
      let { data, error } = await query
      if (error && table === 'profiles') ({ data } = await supabase.from('profiles').select('*').ilike('full_name', `%${needle}%`).limit(15))
      let list = data || []
      if (value && !list.some(r => r.id === value)) {
        const { data: cur } = await supabase.from(table).select('*').eq('id', value).maybeSingle()
        if (cur) list = [cur, ...list]
      }
      setOpts(list)
    }, 250)
    return () => clearTimeout(t)
  }, [q, table, value])

  return (
    <div style={{ display: 'grid', gap: '.4rem' }}>
      <input className="a-in" placeholder={placeholder || 'Gõ để tìm…'} value={q} onChange={e => setQ(e.target.value)} />
      <select className="a-sel" value={value || ''} onChange={e => onChange(e.target.value)} required>
        <option value="">— Chọn —</option>
        {opts.map(r => <option key={r.id} value={r.id}>{label(r)}</option>)}
      </select>
    </div>
  )
}
