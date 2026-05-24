import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 480px)'

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
