import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { Env } from './config/env'
import { runMigrations } from './database/migrate'
import { configureApp } from './setup'

async function bootstrap(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) await runMigrations(process.env.DATABASE_URL)
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  const config = app.get<ConfigService<Env, true>>(ConfigService)
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }).split(','), credentials: true })
  configureApp(app)
  app.enableShutdownHooks()
  await app.listen(config.get('PORT', { infer: true }))
}

void bootstrap()
