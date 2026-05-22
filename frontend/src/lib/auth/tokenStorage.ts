const ACCESS_TOKEN_KEY = 'smart-resume-access-token'
const ACCESS_TOKEN_EVENT = 'smart-resume-access-token-change'

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function persistAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  emitAccessTokenChange(token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  emitAccessTokenChange(null)
}

export function subscribeAccessToken(listener: (token: string | null) => void) {
  const handleTokenEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ token: string | null }>).detail
    listener(detail?.token ?? null)
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY) {
      listener(event.newValue)
    }
  }

  window.addEventListener(ACCESS_TOKEN_EVENT, handleTokenEvent as EventListener)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(ACCESS_TOKEN_EVENT, handleTokenEvent as EventListener)
    window.removeEventListener('storage', handleStorageEvent)
  }
}

function emitAccessTokenChange(token: string | null) {
  window.dispatchEvent(new CustomEvent(ACCESS_TOKEN_EVENT, { detail: { token } }))
}
