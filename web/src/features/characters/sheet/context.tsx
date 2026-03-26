import { useQueryClient } from '@tanstack/react-query'
import type { RollMode } from '@taverna/rules-core'
import { derive, type Sheet5e } from '@taverna/rules-5e'
import type { CharacterDto } from '@taverna/shared'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useRoll } from '../../dice/hooks'
import { useCharacterMutations } from '../hooks'
import { type SaveStatus, SheetContext, type SheetContextValue } from './sheet-context'

const SAVE_DELAY = 700

export function SheetProvider({ campaignId, character, children }: { campaignId: string; character: CharacterDto; children: ReactNode }) {
  const queryClient = useQueryClient()
  const { update } = useCharacterMutations(campaignId)
  const rollMutation = useRoll(campaignId)
  const [draft, setDraft] = useState({ name: character.name, sheet: character.sheet })
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [mode, setMode] = useState<RollMode>('normal')
  const latest = useRef(draft)
  const version = useRef(character.version)
  const dirty = useRef(false)
  const inFlight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = useRef(update.mutate)
  save.current = update.mutate

  useEffect(() => {
    if (dirty.current || inFlight.current || character.version === version.current) return
    version.current = character.version
    latest.current = { name: character.name, sheet: character.sheet }
    setDraft(latest.current)
  }, [character])

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirty.current || inFlight.current) return
    dirty.current = false
    inFlight.current = true
    setStatus('saving')
    const sent = latest.current
    save.current(
      { id: character.id, version: version.current, name: sent.name, sheet: sent.sheet },
      {
        onSuccess: (saved) => {
          version.current = saved.version
          inFlight.current = false
          if (dirty.current) flush()
          else setStatus('saved')
        },
        onError: (error) => {
          inFlight.current = false
          if (error instanceof ApiError && error.status === 409) {
            dirty.current = false
            setStatus('saved')
            toast.error(error.message)
            void queryClient.invalidateQueries({ queryKey: queryKeys.character(campaignId, character.id) })
            return
          }
          dirty.current = true
          setStatus('error')
          toast.error(error.message)
        }
      }
    )
  }, [character.id, campaignId, queryClient])

  const schedule = useCallback(() => {
    dirty.current = true
    setStatus('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }, [flush])

  useEffect(
    () => () => {
      if (dirty.current) flush()
    },
    [flush]
  )

  const change = useCallback(
    (fn: (sheet: Sheet5e) => Sheet5e) => {
      latest.current = { ...latest.current, sheet: fn(latest.current.sheet) }
      setDraft(latest.current)
      schedule()
    },
    [schedule]
  )

  const rename = useCallback(
    (name: string) => {
      latest.current = { ...latest.current, name }
      setDraft(latest.current)
      if (name.trim()) schedule()
    },
    [schedule]
  )

  const roll = useCallback<SheetContextValue['roll']>(
    (expression, label, options = {}) => {
      rollMutation.mutate(
        { expression, label: `${latest.current.name}: ${label}`.slice(0, 80) },
        {
          onSuccess: (result) => {
            const { total, critical } = result.result
            const text = `${label}: ${total}`
            if (critical === 'success') toast.success(`${text} · 20 natural!`)
            else if (critical === 'failure') toast.error(`${text} · 1 natural`)
            else toast(text, { description: result.result.expression })
            options.onResult?.(result)
          },
          onError: (error) => toast.error(error.message)
        }
      )
      if (options.d20) setMode('normal')
    },
    [rollMutation]
  )

  const derived = useMemo(() => derive(draft.sheet), [draft.sheet])

  const value: SheetContextValue = {
    campaignId,
    character,
    name: draft.name,
    sheet: draft.sheet,
    derived,
    editable: character.access === 'edit',
    status,
    mode,
    setMode,
    rename,
    change,
    roll,
    rolling: rollMutation.isPending
  }

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
}
