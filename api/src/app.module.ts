import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthController } from './modules/health/health.controller'

const webDist = join(__dirname, '..', '..', 'web', 'dist')

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        autoLogging: { ignore: (req) => req.url === '/api/health' }
      }
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ...(existsSync(webDist) ? [ServeStaticModule.forRoot({ rootPath: webDist, exclude: ['/api/{*path}', '/socket.io/{*path}'] })] : []),
    DatabaseModule,
    AuthModule
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
