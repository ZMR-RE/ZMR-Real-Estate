import { useCallback, useState, type CSSProperties } from 'react'

// Owner request (Oct 1, 2026): the property address stays visible with the
// tabs while scrolling. The sticky header's height isn't fixed — a long
// address wraps to two or three lines on a phone — so it's measured live
// and exposed as --sticky-tab-bar-height on the page wrapper. The existing
// sticky <thead> rule (index.css, "Sticky/frozen headers") reads that
// variable, so table headers on every property tab sit just below the
// address + tabs instead of sliding underneath them. The :root value
// (43px, the bare tab bar) stays the fallback everywhere else.
export function useStickyHeaderHeight() {
  const [height, setHeight] = useState<number | null>(null)

  // Callback ref: (re)attaches the observer whenever the header mounts,
  // including after the profile finishes loading.
  const measureHeader = useCallback((node: HTMLElement | null) => {
    if (!node) return
    const update = () => setHeight(Math.ceil(node.getBoundingClientRect().height))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const heightStyle = height === null ? undefined : ({ '--sticky-tab-bar-height': `${height}px` } as CSSProperties)
  return { measureHeader, heightStyle }
}
