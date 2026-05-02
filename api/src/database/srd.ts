import type { CompendiumKind } from '@taverna/shared'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { Pool } from 'pg'
import * as schema from './schema'

interface SrdEntry {
  kind: CompendiumKind
  slug: string
  name: string
  lang: string
  summary: string
  meta: Record<string, unknown>
  body: string
  data: Record<string, unknown>
}

export function loadSrd(): SrdEntry[] {
  const file = join(__dirname, '..', '..', 'srd', 'srd-5.1.json.gz')
  return JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as SrdEntry[]
}

export async function importSrd(connectionString: string): Promise<number> {
  const pool = new Pool({ connectionString, max: 1 })
  try {
    const db = drizzle(pool, { schema })
    const entries = loadSrd()
    for (let i = 0; i < entries.length; i += 200) {
      await db
        .insert(schema.compendiumEntries)
        .values(entries.slice(i, i + 200).map((entry) => ({ ...entry, system: 'dnd5e' as const, published: true })))
        .onConflictDoUpdate({
          target: [schema.compendiumEntries.system, schema.compendiumEntries.slug],
          set: {
            name: sql`excluded.name`,
            summary: sql`excluded.summary`,
            lang: sql`excluded.lang`,
            meta: sql`excluded.meta`,
            body: sql`excluded.body`,
            data: sql`excluded.data`,
            updatedAt: sql`now()`
          }
        })
    }
    return entries.length
  } finally {
    await pool.end()
  }
}
