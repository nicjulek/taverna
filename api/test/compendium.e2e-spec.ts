import { INestApplication } from '@nestjs/common'
import type { CompendiumEntryDto, CompendiumSummaryDto } from '@taverna/shared'
import { createApp, signUp, TestUser } from './helpers'

type Page = { items: CompendiumSummaryDto[]; hasMore: boolean }

describe('compêndio', () => {
  let app: INestApplication
  let gm: TestUser
  let player: TestUser
  let base: string

  beforeAll(async () => {
    app = await createApp()
    gm = await signUp(app, 'Mestra')
    player = await signUp(app, 'Jogadora')
    const campaign = await gm.agent().post('/api/campaigns').send({ name: 'Bibliotecas' }).expect(201)
    base = `/api/campaigns/${campaign.body.id}/compendium`
    await player.agent().post(`/api/invites/${campaign.body.inviteCode}/accept`).expect(200)
  })

  afterAll(async () => {
    await app.close()
  })

  const search = async (user: TestUser, query: string) => (await user.agent().get(`${base}?${query}`).expect(200)).body as Page

  it('traz o SRD 5.1 importado pela migração', async () => {
    const spells = await search(player, 'kind=spell')
    expect(spells.items).toHaveLength(40)
    expect(spells.hasMore).toBe(true)
    expect(spells.items[0]?.meta.level).toBe(0)
    const conditions = await search(player, 'kind=condition')
    expect(conditions.items.map((c) => c.name)).toContain('Cego')
  })

  it('busca por nome e filtra magias por círculo, escola e classe', async () => {
    const page = await search(player, 'kind=spell&q=fire&level=3&school=evocation&className=wizard')
    expect(page.items.map((s) => s.name)).toEqual(['Fireball'])
    const fireball = (await player.agent().get(`${base}/${page.items[0]!.id}`).expect(200)).body as CompendiumEntryDto
    expect(fireball.body).toContain('bright streak')
    expect(fireball.data.damageBySlot).toMatchObject({ '3': '8d6' })
  })

  it('filtra monstros por nível de desafio e tipo', async () => {
    const page = await search(player, 'kind=monster&type=humanoid&crMax=0.25')
    expect(page.items.length).toBeGreaterThan(3)
    expect(page.items.every((m) => Number(m.meta.cr) <= 0.25 && m.meta.type === 'humanoid')).toBe(true)
    expect(page.items.map((m) => m.name)).toContain('Goblin')
    const names = page.items.map((m) => m.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
    expect(page.items.find((m) => m.name === 'Goblin')?.summary).toBe('Humanoide pequeno, ND 1/4')
  })

  it('pagina e trata caracteres especiais na busca', async () => {
    const first = await search(player, 'kind=item&category=weapon')
    const second = await search(player, 'kind=item&category=weapon&offset=40')
    expect(first.items.length + second.items.length).toBe(37)
    expect((await search(player, 'q=%25')).items).toEqual([])
  })

  it('o mestre cria homebrew; a jogadora só vê depois de publicado', async () => {
    const created = await gm
      .agent()
      .post(base)
      .send({
        kind: 'item',
        name: 'Lâmina de Pedraluz',
        summary: 'Espada longa, rara',
        meta: { category: 'magic', rarity: 'rare' },
        body: 'Brilha perto de cristais.'
      })
      .expect(201)
    expect(created.body).toMatchObject({ source: 'homebrew', published: false, lang: 'pt-BR' })
    expect((await search(player, 'q=Pedraluz')).items).toEqual([])
    expect((await search(gm, 'q=Pedraluz&source=homebrew')).items).toHaveLength(1)
    await player.agent().get(`${base}/${created.body.id}`).expect(404)

    await gm
      .agent()
      .patch(`${base}/${created.body.id}`)
      .send({ kind: 'item', name: 'Lâmina de Pedraluz', meta: { category: 'magic', rarity: 'rare' }, published: true })
      .expect(200)
    expect((await search(player, 'kind=item&rarity=rare&q=pedraluz')).items[0]?.name).toBe('Lâmina de Pedraluz')
  })

  it('jogadora não cria nem apaga, e ninguém mexe no SRD', async () => {
    await player.agent().post(base).send({ kind: 'spell', name: 'Trapaça' }).expect(403)
    const goblin = (await search(gm, 'kind=monster&q=goblin')).items[0]!
    await gm.agent().delete(`${base}/${goblin.id}`).expect(404)
    await gm.agent().patch(`${base}/${goblin.id}`).send({ kind: 'monster', name: 'Goblin malvado' }).expect(404)
  })

  it('valida o homebrew', async () => {
    const res = await gm.agent().post(base).send({ kind: 'race', name: '' }).expect(400)
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['kind', 'name']))
  })
})
