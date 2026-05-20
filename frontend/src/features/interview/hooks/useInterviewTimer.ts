import { useCallback, useEffect, useRef, useState } from 'react'

export function useInterviewTimer(isActive: boolean, initialSeconds = 0) {
  const [elapsed, setElapsed] = useState(initialSeconds)
  const intervalRef = useRef<number | null>(null)
  const isActiveRef = useRef(isActive)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  // Sync elapsed when initialSeconds changes (e.g. detail loaded from backend)
  useEffect(() => {
    setElapsed(initialSeconds) // eslint-disable-line react-hooks/set-state-in-effect -- intentional sync from prop
  }, [initialSeconds])

  const startTimer = useCallback(() => {
    if (intervalRef.current !== null) return
    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      startTimer()
    } else {
      stopTimer()
    }
    return stopTimer
  }, [isActive, startTimer, stopTimer])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        stopTimer()
      } else if (isActiveRef.current) {
        startTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [startTimer, stopTimer])

  const formatted = formatTime(elapsed)

  return { elapsed, formatted, reset: () => setElapsed(0) }
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
