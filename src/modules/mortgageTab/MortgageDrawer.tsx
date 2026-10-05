import { useEffect, useRef, type ReactNode } from 'react'
export function MortgageDrawer({title, busy, onCancel, children}: {title: string; busy: boolean; onCancel: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current!
    el.showModal()
    return () => el.close()
  }, [])
  return <dialog ref={ref} className="mortgage-drawer" aria-label={title} onCancel={e => {e.preventDefault(); if (!busy) onCancel()}}><h2>{title}</h2>{children}</dialog>
}
