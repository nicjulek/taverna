import { useQueryClient } from '@tanstack/react-query'
import type { DragEvent } from 'react'
import { toast } from 'sonner'
import { compendiumEntryQuery } from '../../compendium/hooks'
import { attackFromEntry, canAddToSheet, DRAG_TYPE, type DragPayload, spellFromEntry } from '../../compendium/to-sheet'
import { useSheet } from './sheet-context'

export function useAddFromCompendium(onAdded?: (target: 'spell' | 'attack') => void) {
  const queryClient = useQueryClient()
  const { campaignId, change } = useSheet()
  return async (id: string) => {
    const entry = await queryClient.fetchQuery(compendiumEntryQuery(campaignId, id))
    const target = canAddToSheet(entry)
    if (target === 'spell') change((s) => ({ ...s, spells: [...s.spells, spellFromEntry(entry)] }))
    else if (target === 'attack') change((s) => ({ ...s, attacks: [...s.attacks, attackFromEntry(entry)] }))
    else return toast.error(`${entry.name} não vai para a ficha. Só magias e armas.`)
    toast.success(`${entry.name} entrou na ficha`)
    onAdded?.(target)
  }
}

export function readDrop(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_TYPE)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return null
  }
}
