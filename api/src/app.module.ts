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
import { CampaignsModule } from './modules/campaigns/campaigns.module'
import { JournalsModule } from './modules/journals/journals.module'
import { AssetsModule } from './modules/assets/assets.module'
import { ScenesModule } from './modules/scenes/scenes.module'
import { CompendiumModule } from './modules/compendium/compendium.module'
import { CharactersModule } from './modules/characters/characters.module'
import { RollsModule } from './modules/rolls/rolls.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { HealthController } from './modules/health/health.controller'

const webDist = join(__dirname, '..', '..', 'web', 'dist')

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode })
        }
      }
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 300 }],
      errorMessage: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
      skipIf: () => process.env.THROTTLE === 'off'
    }),
    ...(existsSync(webDist) ? [ServeStaticModule.forRoot({ rootPath: webDist, exclude: ['/api/{*path}', '/socket.io/{*path}'] })] : []),
    DatabaseModule,
    RealtimeModule,
    AuthModule,
    CampaignsModule,
    JournalsModule,
    RollsModule,
    CharactersModule,
    CompendiumModule,
    AssetsModule,
    ScenesModule
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
