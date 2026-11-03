import { useCallback, useEffect, useRef, useState } from 'react'

// Cuộn vô hạn (lazy load): chỉ tải thêm một trang khi phần tử `sentinel` sắp lọt vào màn hình.
// fetchPage(from, to) → { data, count, error } (cú pháp trả về của supabase .range()).
export function useInfinite(fetchPage, deps, size = 12) {
  const [st, setSt] = useState({ items: null, count: 0, error: '', done: false })
  const busy = useRef(false)
  const gen = useRef(0)
  const items = useRef([])
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  const obs = useRef(null)

  const loadMore = useCallback(async (reset) => {
    if (busy.current && !reset) return
    const my = reset ? ++gen.current : gen.current
    busy.current = true
    const from = reset ? 0 : items.current.length
    const { data, count, error } = await fetchRef.current(from, from + size - 1)
    if (my !== gen.current) return
    busy.current = false
    if (error) { setSt(s => ({ ...s, items: s.items || [], error: error.message, done: true })); return }
    items.current = reset ? data : [...items.current, ...data]
    setSt({ items: items.current, count: count ?? items.current.length, error: '', done: data.length < size })
  }, [size])

  useEffect(() => {
    items.current = []
    setSt(s => ({ ...s, items: null, done: false }))
    loadMore(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const sentinel = useCallback((node) => {
    obs.current?.disconnect()
    if (!node) return
    obs.current = new IntersectionObserver(es => { if (es[0].isIntersecting) loadMore(false) }, { rootMargin: '500px' })
    obs.current.observe(node)
  }, [loadMore])

  return { ...st, sentinel, loadMore: () => loadMore(false), reload: () => loadMore(true) }
}

// Gom rút gọn danh sách số trang: 1 … 4 5 [6] 7 8 … 20
export function pageList(page, pages) {
  const s = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2].filter(n => n >= 1 && n <= pages))
  const arr = [...s].sort((a, b) => a - b), out = []
  arr.forEach((n, i) => { if (i && n - arr[i - 1] > 1) out.push('d' + n); out.push(n) })
  return out
}
