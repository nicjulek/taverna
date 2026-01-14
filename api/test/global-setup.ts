import { Client } from 'pg'
import { runMigrations } from '../src/database/migrate'

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://taverna:taverna@localhost:5432/taverna_test'

export default async function globalSetup(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  await client.query('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;')
  await client.end()
  await runMigrations(TEST_DATABASE_URL)
}
