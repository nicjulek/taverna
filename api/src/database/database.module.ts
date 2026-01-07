import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { Env } from '../config/env'
import * as schema from './schema'

export const DB = Symbol('DB')
export const PG_POOL = Symbol('PG_POOL')
export type Database = NodePgDatabase<typeof schema>

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => new Pool({ connectionString: config.get('DATABASE_URL', { infer: true }), max: 10 })
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema })
    }
  ],
  exports: [DB, PG_POOL]
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end()
  }
}
