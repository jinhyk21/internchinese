import { useEffect, useState } from 'react'

// mobile < 700 · tablet 700–1099 · desktop ≥ 1100
const get = () => {
  const w = window.innerWidth
  return w < 700 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'
}

export function useBreakpoint() {
  const [bp, setBp] = useState(get)
  useEffect(() => {
    const on = () => setBp(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return bp
}
