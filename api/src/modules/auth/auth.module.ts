import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { AuthGuard } from '../../common/auth'
import { Env } from '../../config/env'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { UsersService } from './users.service'

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '30d' }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [UsersService]
})
export class AuthModule {}
