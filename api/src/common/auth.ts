import { CanActivate, createParamDecorator, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

export const SESSION_COOKIE = 'taverna_session'
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface AuthUser {
  id: string
}

interface SessionPayload {
  sub: string
}

const IS_PUBLIC = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC, true)

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>()
  if (!request.user) throw new UnauthorizedException()
  return request.user
})

export async function readSession(jwt: JwtService, token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  try {
    const payload = await jwt.verifyAsync<SessionPayload>(token)
    return { id: payload.sub }
  } catch {
    return null
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])
    if (isPublic) return true
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const user = await readSession(this.jwt, request.cookies?.[SESSION_COOKIE] as string | undefined)
    if (!user) throw new UnauthorizedException('Faça login para continuar')
    request.user = user
    return true
  }
}
