import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

const DEFAULT_ROLE = 'student'

// Quyền luôn lấy từ DB (profiles.role) sau khi đăng nhập; metadata lúc đăng ký chỉ là giá trị khởi tạo,
// vì user tự sửa được user_metadata nên KHÔNG dùng nó để cấp quyền admin.
async function loadProfile(user) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) return null
  if (!data) {
    const { data: created } = await supabase.from('profiles')
      .insert({ id: user.id, full_name: user.user_metadata?.full_name || '', role: DEFAULT_ROLE }).select().maybeSingle()
    return created
  }
  if (!data.role) {   // quyền rỗng → tự gán quyền người dùng thường
    const { data: fixed } = await supabase.from('profiles').update({ role: DEFAULT_ROLE }).eq('id', user.id).select().maybeSingle()
    return fixed || { ...data, role: DEFAULT_ROLE }
  }
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const user = session?.user
  const uid = user?.id
  useEffect(() => {
    if (!uid) return setProfile(null)
    let live = true
    loadProfile(user).then(async p => {
      if (!live) return
      if (p?.is_active === false) { setBlocked(true); setProfile(null); await supabase.auth.signOut(); return }
      setBlocked(false); setProfile(p)
    })
    return () => { live = false }
  }, [uid])

  const isAdmin = profile?.role === 'admin'
  return (
    <Ctx.Provider value={{ session, user, profile, setProfile, loading, isAdmin, blocked }}>
      {children}
    </Ctx.Provider>
  )
}
