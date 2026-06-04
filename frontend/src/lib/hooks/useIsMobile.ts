import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 480px)'

function subscribeMediaQuery(query: string, callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const mql = window.matchMedia(query)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getMediaQuerySnapshot(query: string) {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(query).matches
}

function getServerSnapshot() {
  return false
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribeMediaQuery(query, callback),
    () => getMediaQuerySnapshot(query),
    getServerSnapshot,
  )
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT_QUERY)
}
