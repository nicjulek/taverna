import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { LoginInput, RegisterInput, UserDto } from '@taverna/shared'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { users } from '../../database/schema'
import { toUserDto, USER_COLORS } from './users.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService
  ) {}

  async register(input: RegisterInput): Promise<UserDto> {
    const existing = await this.db.query.users.findFirst({ where: eq(users.email, input.email) })
    if (existing)
      throw new ConflictException({
        message: 'Já existe uma conta com esse e-mail',
        fields: { email: 'Já existe uma conta com esse e-mail' }
      })
    const passwordHash = await bcrypt.hash(input.password, 10)
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)] ?? USER_COLORS[0]!
    const [user] = await this.db
      .insert(users)
      .values({ email: input.email, displayName: input.displayName, passwordHash, color })
      .returning()
    return toUserDto(user!)
  }

  async login(input: LoginInput): Promise<UserDto> {
    const user = await this.db.query.users.findFirst({ where: eq(users.email, input.email) })
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha incorretos')
    return toUserDto(user)
  }

  sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId })
  }
}
