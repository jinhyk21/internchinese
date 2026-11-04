import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'

// kind: 'scenario' | 'vocabulary'
export default function Bookmark({ kind, id, initial, onChange }) {
  const { user } = useAuth()
  const toast = useToast()
  const [on, setOn] = useState(initial)
  const col = kind + '_id'
  const toggle = async (e) => {
    e.stopPropagation()
    const { error } = on
      ? await supabase.from('bookmarks').delete().eq('user_id', user.id).eq(col, id)
      : await supabase.from('bookmarks').insert({ user_id: user.id, item_type: kind, [col]: id })
    if (error) return toast('Không lưu được: ' + error.message, 'err')
    toast(on ? 'Đã bỏ lưu' : 'Đã lưu vào mục Đã lưu')
    setOn(!on); onChange?.(!on)
  }
  return <button className={on ? 'star on' : 'star'} onClick={toggle} title="Lưu">★</button>
}
