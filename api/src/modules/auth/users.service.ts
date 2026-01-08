import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UpdateProfileInput, UserDto } from '@taverna/shared'
import { eq } from 'drizzle-orm'
import { Database, DB } from '../../database/database.module'
import { users } from '../../database/schema'

export const USER_COLORS = ['#c58b3a', '#4f8a8b', '#a3516b', '#6b7f3a', '#5b6ab0', '#b0663a', '#7d5ba6', '#3f8f6a']

export function toUserDto(user: typeof users.$inferSelect): UserDto {
  return { id: user.id, email: user.email, displayName: user.displayName, color: user.color }
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findById(id: string): Promise<UserDto> {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, id) })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return toUserDto(user)
  }

  async update(id: string, input: UpdateProfileInput): Promise<UserDto> {
    const [user] = await this.db.update(users).set(input).where(eq(users.id, id)).returning()
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return toUserDto(user)
  }
}
