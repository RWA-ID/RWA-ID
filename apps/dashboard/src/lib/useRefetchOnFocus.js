import { useEffect, useRef } from 'react'

/**
 * Calls `fn` when the tab becomes visible again. A claim made in another tab
 * (or another wallet) changes contract state that a page only read on mount.
 */
export function useRefetchOnFocus(fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') ref.current() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
