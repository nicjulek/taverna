import { Controller, Get, Inject } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { Public } from '../../common/auth'
import { Database, DB } from '../../database/database.module'

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok'; database: 'ok' | 'error' }> {
    try {
      await this.db.execute(sql`select 1`)
      return { status: 'ok', database: 'ok' }
    } catch {
      return { status: 'ok', database: 'error' }
    }
  }
}
