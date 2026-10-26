import type { CampaignImport } from '@taverna/shared'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCampaignFile } from './portability.service'

let cached: CampaignImport | null = null

export function loadDemo(): CampaignImport {
  cached ??= parseCampaignFile(readFileSync(join(__dirname, '..', '..', '..', 'demo', 'pedraluz.campanha.json.gz')))
  return cached
}
