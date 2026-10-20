import { useSyncExternalStore } from 'react'

const KEY = 'taverna:dados-3d'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setDice3d(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    return
  } finally {
    listeners.forEach((listener) => listener())
  }
}

export function useDice3d(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => false
  )
}
