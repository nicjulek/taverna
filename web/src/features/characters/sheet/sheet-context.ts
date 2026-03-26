import type { RollMode } from '@taverna/rules-core'
import type { DerivedSheet, Sheet5e } from '@taverna/rules-5e'
import type { CharacterDto, RollDto } from '@taverna/shared'
import { createContext, useContext } from 'react'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export interface SheetContextValue {
  campaignId: string
  character: CharacterDto
  name: string
  sheet: Sheet5e
  derived: DerivedSheet
  editable: boolean
  status: SaveStatus
  mode: RollMode
  setMode: (mode: RollMode) => void
  rename: (name: string) => void
  change: (update: (sheet: Sheet5e) => Sheet5e) => void
  roll: (expression: string, label: string, options?: { d20?: boolean; onResult?: (roll: RollDto) => void }) => void
  rolling: boolean
}

export const SheetContext = createContext<SheetContextValue | null>(null)

export function useSheet(): SheetContextValue {
  const value = useContext(SheetContext)
  if (!value) throw new Error('useSheet fora da ficha')
  return value
}
