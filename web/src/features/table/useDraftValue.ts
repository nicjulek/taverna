import { useEffect, useRef, useState } from 'react'

export function useDraftValue<T>(value: T, commit: (value: T) => void, delay = 450) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef(commit)
  const pending = useRef<{ value: T } | null>(null)

  useEffect(() => {
    latest.current = commit
  }, [commit])

  useEffect(() => {
    if (!pending.current) setDraft(value)
  }, [value])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (pending.current) latest.current(pending.current.value)
    },
    []
  )

  const change = (next: T) => {
    setDraft(next)
    pending.current = { value: next }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      pending.current = null
      latest.current(next)
    }, delay)
  }

  return [draft, change] as const
}
