import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import { LoginInput, loginSchema, RegisterInput, registerSchema, UpdateProfileInput, updateProfileSchema, UserDto } from '@taverna/shared'
import { Response } from 'express'
import { AuthUser, CurrentUser, Public, SESSION_COOKIE, SESSION_MAX_AGE_MS } from '../../common/auth'
import { ZodPipe } from '../../common/zod.pipe'
import { Env } from '../../config/env'
import { AuthService } from './auth.service'
import { UsersService } from './users.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(@Body(new ZodPipe(registerSchema)) body: RegisterInput, @Res({ passthrough: true }) res: Response): Promise<UserDto> {
    const user = await this.auth.register(body)
    await this.startSession(res, user.id)
    return user
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body(new ZodPipe(loginSchema)) body: LoginInput, @Res({ passthrough: true }) res: Response): Promise<UserDto> {
    const user = await this.auth.login(body)
    await this.startSession(res, user.id)
    return user
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' })
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.users.findById(user.id)
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput): Promise<UserDto> {
    return this.users.update(user.id, body)
  }

  private async startSession(res: Response, userId: string): Promise<void> {
    const token = await this.auth.sign(userId)
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/'
    })
  }
}
