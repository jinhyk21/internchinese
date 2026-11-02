import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'

// kind: 'scenario' | 'vocabulary'
export default function Bookmark({ kind, id, initial, onChange }) {
  const { user } = useAuth()
  const [on, setOn] = useState(initial)
  const col = kind + '_id'
  const toggle = async (e) => {
    e.stopPropagation()
    if (on) await supabase.from('bookmarks').delete().eq('user_id', user.id).eq(col, id)
    else await supabase.from('bookmarks').insert({ user_id: user.id, item_type: kind, [col]: id })
    setOn(!on); onChange?.(!on)
  }
  return <button className={on ? 'star on' : 'star'} onClick={toggle} title="Lưu">★</button>
}
