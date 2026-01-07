import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { join } from 'node:path'
import { Pool } from 'pg'

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 })
  try {
    await migrate(drizzle(pool), { migrationsFolder: join(__dirname, '..', '..', 'drizzle') })
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Defina DATABASE_URL')
  runMigrations(url)
    .then(() => console.log('Migrations aplicadas'))
    .catch((error: unknown) => {
      console.error(error)
      process.exit(1)
    })
}
