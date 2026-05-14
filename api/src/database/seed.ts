import { roll } from '@taverna/dice'
import { newSheet, type Sheet5e } from '@taverna/rules-5e'
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

  const lia: Sheet5e = {
    ...newSheet({ classKey: 'rogue', level: 3, race: 'Halfling' }),
    background: 'Criminosa',
    alignment: 'Caótica e boa',
    abilities: { str: 8, dex: 17, con: 14, int: 12, wis: 13, cha: 10 },
    skills: {
      stealth: 'expertise',
      'sleight-of-hand': 'expertise',
      perception: 'proficient',
      acrobatics: 'proficient',
      deception: 'proficient',
      investigation: 'proficient'
    },
    halflingLucky: true,
    armorClass: 14,
    hp: { current: 17, max: 24, temporary: 0 },
    attacks: [
      { id: 'adaga', name: 'Adaga', ability: 'dex', proficient: true, bonus: 0, damage: '1d4', damageType: 'perfurante' },
      { id: 'arco', name: 'Arco curto', ability: 'dex', proficient: true, bonus: 0, damage: '1d6', damageType: 'perfurante' }
    ],
    notes: 'Deve 30 peças de ouro ao Corvo Cinzento. Não conta para ninguém.'
  }
  const doran: Sheet5e = {
    ...newSheet({ classKey: 'cleric', level: 3, race: 'Anão da montanha' }),
    background: 'Acólito',
    abilities: { str: 14, dex: 8, con: 15, int: 10, wis: 16, cha: 12 },
    skills: { medicine: 'proficient', religion: 'proficient', insight: 'proficient', history: 'proficient' },
    armorClass: 18,
    speed: 8,
    hp: { current: 27, max: 27, temporary: 0 },
    slotsUsed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    concentration: 'Bênção',
    spells: [
      { id: 'chama', name: 'Chama sagrada', level: 0, prepared: true, notes: '' },
      { id: 'taumaturgia', name: 'Taumaturgia', level: 0, prepared: true, notes: '' },
      { id: 'bencao', name: 'Bênção', level: 1, prepared: true, notes: '' },
      { id: 'curar', name: 'Curar ferimentos', level: 1, prepared: true, notes: '' },
      { id: 'escudo', name: 'Escudo da fé', level: 1, prepared: false, notes: '' },
      { id: 'arma', name: 'Arma espiritual', level: 2, prepared: true, notes: '' }
    ],
    attacks: [
      { id: 'martelo', name: 'Martelo de guerra', ability: 'str', proficient: true, bonus: 0, damage: '1d8', damageType: 'concussão' }
    ]
  }
  await db.insert(schema.characters).values([
    { campaignId: campaign!.id, ownerId: ana.id, name: 'Lia Pés-Leves', sheet: lia },
    { campaignId: campaign!.id, ownerId: bruno.id, name: 'Doran Martelo-de-Brasa', sheet: doran }
  ])

  await db.insert(schema.compendiumEntries).values([
    {
      campaignId: campaign!.id,
      authorId: gm.id,
      kind: 'item',
      name: 'Cristal de Pedraluz',
      summary: 'Itens mágicos, incomum',
      meta: { category: 'magic', rarity: 'uncommon', cost: '', weight: null },
      body: 'Brilha com luz fraca num raio de 3 metros quando há minério a menos de 30 metros. Uma vez por descanso longo, quem segura pode quebrar o cristal para ter vantagem num teste de Sabedoria (Percepção) feito no subterrâneo.',
      published: true
    },
    {
      campaignId: campaign!.id,
      authorId: gm.id,
      kind: 'monster',
      name: 'Kobold das minas',
      summary: 'Humanoide pequeno, ND 1/4',
      meta: { cr: 0.25, crLabel: '1/4', type: 'humanoid', size: 'Small', ac: 13, hp: 7, xp: 50 },
      body: 'Os kobolds que tomaram a mina antiga conhecem cada túnel e preparam armadilhas com pedras soltas.',
      data: {
        alignment: 'leal e mau',
        armorClass: [{ value: 13, type: 'couro batido' }],
        hitPoints: 7,
        hitDice: '3d6-3',
        speed: { walk: '9 m' },
        abilities: { str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8 },
        senses: { 'visão no escuro': '18 m', 'percepção passiva': 8 },
        languages: 'Comum, Dracônico',
        traits: [
          {
            name: 'Táticas de bando',
            desc: 'Tem vantagem no ataque quando um aliado está a 1,5 m do alvo.',
            attackBonus: null,
            damage: [],
            dc: null
          }
        ],
        actions: [
          {
            name: 'Picareta',
            desc: 'Ataque corpo a corpo: +4 para acertar, alcance 1,5 m. Acerto: 4 (1d4+2) de dano perfurante.',
            attackBonus: 4,
            damage: [{ dice: '1d4+2', type: 'Perfurante' }],
            dc: null
          },
          {
            name: 'Pedra solta',
            desc: 'Derruba pedras do teto. Criaturas numa área de 3 m fazem salvaguarda de Destreza CD 11 ou sofrem 2d6 de dano de concussão.',
            attackBonus: null,
            damage: [{ dice: '2d6', type: 'Concussão' }],
            dc: { ability: 'dex', value: 11 }
          }
        ]
      },
      published: false
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
