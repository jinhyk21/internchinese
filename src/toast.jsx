import { createContext, useCallback, useContext, useRef, useState } from 'react'

const Ctx = createContext(() => {})
// toast('Đã lưu') · toast('Lỗi…', 'err') · toast('Lưu ý…', 'info')
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  const seq = useRef(0)
  const close = useCallback((id) => setList(l => l.filter(x => x.id !== id)), [])
  const toast = useCallback((text, kind = 'ok') => {
    if (!text) return
    const id = ++seq.current
    setList(l => [...l.filter(x => x.text !== text).slice(-3), { id, text, kind }])
    setTimeout(() => close(id), kind === 'err' ? 6000 : 3200)
  }, [close])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map(t => (
          <div key={t.id} className={'toast ' + t.kind} onClick={() => close(t.id)}>
            <span className="ti">{t.kind === 'err' ? '!' : t.kind === 'info' ? 'i' : '✓'}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
