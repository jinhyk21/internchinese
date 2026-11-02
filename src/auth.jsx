import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) return setProfile(null)
    supabase.from('profiles').select('*').eq('id', uid).single()
      .then(({ data }) => setProfile(data))
  }, [uid])

  return (
    <Ctx.Provider value={{ session, user: session?.user, profile, setProfile, loading }}>
      {children}
    </Ctx.Provider>
  )
}
