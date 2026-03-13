import { roll } from '@taverna/dice'
import bcrypt from 'bcryptjs'
import type { RollVisibility } from '@taverna/shared'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { newInviteCode } from '../modules/campaigns/campaigns.service'
import * as schema from './schema'

export const DEMO_PASSWORD = 'taverna123'

const DEMO_USERS = [
  { email: 'mestre@taverna.dev', displayName: 'Mestre Demo', color: '#c58b3a' },
  { email: 'ana@taverna.dev', displayName: 'Ana', color: '#4f8a8b' },
  { email: 'bruno@taverna.dev', displayName: 'Bruno', color: '#a3516b' }
]

const PAGES = [
  {
    title: 'Resumo da sessão 1',
    folder: 'Sessões',
    defaultAccess: 'view' as const,
    content:
      '# Emboscada na estrada do Vau\n\nO grupo achou a carroça do minerador Tobias tombada na estrada e foi atacado por **quatro kobolds**.\n\n- Seguiram as pegadas até uma mina abandonada\n- Resgataram a capitã Iselda Moraes\n- Tobias continua desaparecido\n\n> “Levaram o velho para baixo da montanha. Para a Dama.”'
  },
  {
    title: 'Capitã Iselda Moraes',
    folder: 'NPCs',
    defaultAccess: 'view' as const,
    content: 'Humana, guarda veterana de Vau-do-Corvo. Quer descobrir por que as minas de Pedraluz voltaram a brilhar à noite.'
  },
  {
    title: 'Quem é a Dama de Cinzas',
    folder: 'Segredos do mestre',
    defaultAccess: 'none' as const,
    content:
      'Uma feiticeira que acordou a forja antiga sob a montanha. Ela precisa do mapa que Tobias carregava para chegar ao coração da mina.'
  }
]

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  await db.delete(schema.users).where(
    inArray(
      schema.users.email,
      DEMO_USERS.map((user) => user.email)
    )
  )
  const users = await db
    .insert(schema.users)
    .values(DEMO_USERS.map((user) => ({ ...user, passwordHash })))
    .returning()
  const [gm, ana, bruno] = users as [typeof schema.users.$inferSelect, typeof schema.users.$inferSelect, typeof schema.users.$inferSelect]

  const [campaign] = await db
    .insert(schema.campaigns)
    .values({
      name: 'As Minas de Pedraluz',
      description:
        'Um grupo de aventureiros chega a Vau-do-Corvo para escoltar mineiros, mas as minas abandonadas voltaram a brilhar à noite.',
      ownerId: gm.id,
      inviteCode: newInviteCode()
    })
    .returning()
  await db.insert(schema.campaignMembers).values([
    { campaignId: campaign!.id, userId: gm.id, role: 'gm' },
    { campaignId: campaign!.id, userId: ana.id, role: 'cogm' },
    { campaignId: campaign!.id, userId: bruno.id, role: 'player' }
  ])
  await db.insert(schema.journals).values([
    ...PAGES.map((page) => ({ ...page, campaignId: campaign!.id, authorId: gm.id })),
    {
      campaignId: campaign!.id,
      authorId: bruno.id,
      title: 'Diário do Bruno',
      folder: 'Pessoal',
      content: 'Não confio na capitã. Ela sabe mais do que conta.'
    }
  ])

  const start = Date.now() - 20 * 60_000
  const rolls: { user: typeof gm; expression: string; visibility?: RollVisibility }[] = [
    { user: gm, expression: '1d20+2 # Iniciativa dos kobolds' },
    { user: ana, expression: '1d20+3 # Iniciativa' },
    { user: bruno, expression: '1d20+1 # Iniciativa' },
    { user: bruno, expression: '2d20kh1+5 # Ataque com arco longo' },
    { user: bruno, expression: '1d8+3 # Dano' },
    { user: ana, expression: '1d20+6 # Furtividade', visibility: 'gm' },
    { user: gm, expression: '1d6+2 # Lança do kobold' }
  ]
  await db.insert(schema.rolls).values(
    rolls.map(({ user, expression, visibility = 'public' }, index) => {
      const result = roll(expression)
      return {
        campaignId: campaign!.id,
        userId: user.id,
        label: result.label,
        visibility,
        result,
        createdAt: new Date(start + index * 90_000)
      }
    })
  )

  const check = await db.query.campaigns.findFirst({ where: eq(schema.campaigns.id, campaign!.id) })
  console.log(`Campanha de demonstração criada: ${check?.name}`)
  console.log(`Contas: ${DEMO_USERS.map((user) => user.email).join(', ')} (senha ${DEMO_PASSWORD})`)
  await pool.end()
}

seed().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
