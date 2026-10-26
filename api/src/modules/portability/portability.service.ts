import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import {
  type CampaignDto,
  type CampaignExport,
  CAMPAIGN_FORMAT,
  type CampaignImport,
  campaignExportSchema,
  CHARACTER_FORMAT,
  type CharacterDto,
  type CharacterExport,
  IMPORT_MAX_BYTES
} from '@taverna/shared'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { gunzipSync } from 'node:zlib'
import { Database, DB } from '../../database/database.module'
import {
  assetBlobs,
  assets,
  campaignMembers,
  campaigns,
  characters,
  compendiumEntries,
  handouts,
  journals,
  jukebox,
  sceneItems,
  scenes
} from '../../database/schema'
import { sniffMime } from '../assets/sniff'
import { AssetsService } from '../assets/assets.service'
import { CampaignAccessService } from '../campaigns/campaign-access.service'
import { CampaignsService, newInviteCode } from '../campaigns/campaigns.service'
import { CharactersService } from '../characters/characters.service'
import { RealtimeService } from '../realtime/realtime.service'

const LINKS = ['assetId', 'characterId', 'compendiumId'] as const

export function parseCampaignFile(buffer: Buffer): CampaignImport {
  let raw = buffer
  if (raw[0] === 0x1f && raw[1] === 0x8b) {
    try {
      raw = gunzipSync(raw, { maxOutputLength: IMPORT_MAX_BYTES })
    } catch {
      throw new BadRequestException('Não consegui abrir o arquivo compactado')
    }
  }
  let json: unknown
  try {
    json = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new BadRequestException('O arquivo não é um JSON válido')
  }
  const parsed = campaignExportSchema.safeParse(json)
  if (!parsed.success) {
    const format = (json as { format?: unknown } | null)?.format
    if (format === CHARACTER_FORMAT) throw new BadRequestException('Esse arquivo é uma ficha. Importe na aba Fichas de uma campanha.')
    if (format !== CAMPAIGN_FORMAT) throw new BadRequestException('Esse arquivo não é uma campanha exportada da Taverna')
    const issue = parsed.error.issues[0]
    throw new BadRequestException(`O arquivo da campanha tem um problema em ${issue?.path.join('.') ?? 'algum campo'}`)
  }
  return parsed.data
}

@Injectable()
export class PortabilityService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly access: CampaignAccessService,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly assets: AssetsService,
    private readonly realtime: RealtimeService
  ) {}

  async exportCharacter(campaignId: string, characterId: string, userId: string): Promise<CharacterExport> {
    const character = await this.characters.get(campaignId, characterId, userId)
    return { format: CHARACTER_FORMAT, version: 1, name: character.name, sheet: character.sheet }
  }

  async importCharacter(campaignId: string, userId: string, input: CharacterExport): Promise<CharacterDto> {
    await this.access.requireMember(campaignId, userId)
    const [row] = await this.db
      .insert(characters)
      .values({ campaignId, ownerId: userId, name: input.name, sheet: input.sheet })
      .returning({ id: characters.id })
    this.realtime.changed(campaignId, 'characters')
    return this.characters.get(campaignId, row!.id, userId)
  }

  async exportCampaign(campaignId: string, userId: string): Promise<CampaignExport> {
    await this.access.requireGameMaster(campaignId, userId)
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, campaignId))
    const files = await this.db
      .select({ id: assets.id, name: assets.name, mime: assets.mime, kind: assets.kind, data: assetBlobs.data })
      .from(assets)
      .innerJoin(assetBlobs, eq(assetBlobs.assetId, assets.id))
      .where(eq(assets.campaignId, campaignId))
      .orderBy(asc(assets.createdAt))
    const pages = await this.db.select().from(journals).where(eq(journals.campaignId, campaignId)).orderBy(asc(journals.createdAt))
    const sheets = await this.db.select().from(characters).where(eq(characters.campaignId, campaignId)).orderBy(asc(characters.createdAt))
    const homebrew = await this.db
      .select()
      .from(compendiumEntries)
      .where(eq(compendiumEntries.campaignId, campaignId))
      .orderBy(asc(compendiumEntries.createdAt))
    const sceneRows = await this.db.select().from(scenes).where(eq(scenes.campaignId, campaignId)).orderBy(asc(scenes.sortOrder))
    const items = sceneRows.length
      ? await this.db
          .select()
          .from(sceneItems)
          .where(
            inArray(
              sceneItems.sceneId,
              sceneRows.map((s) => s.id)
            )
          )
          .orderBy(asc(sceneItems.z), asc(sceneItems.createdAt))
      : []
    const notes = await this.db.select().from(handouts).where(eq(handouts.campaignId, campaignId)).orderBy(asc(handouts.createdAt))
    const [music] = await this.db.select().from(jukebox).where(eq(jukebox.campaignId, campaignId))

    const local = new Set(homebrew.map((entry) => entry.id))
    const referenced = [
      ...new Set(items.map((item) => item.data.compendiumId).filter((id): id is string => typeof id === 'string' && !local.has(id)))
    ]
    const srd = referenced.length
      ? await this.db
          .select({ id: compendiumEntries.id, slug: compendiumEntries.slug })
          .from(compendiumEntries)
          .where(and(inArray(compendiumEntries.id, referenced), isNull(compendiumEntries.campaignId)))
      : []

    return {
      format: CAMPAIGN_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      campaign: { name: campaign!.name, description: campaign!.description, system: 'dnd5e' },
      assets: files.map((file) => ({
        ref: file.id,
        name: file.name,
        mime: file.mime,
        kind: file.kind,
        data: file.data.toString('base64')
      })),
      journals: pages.map((page) => ({ title: page.title, folder: page.folder, content: page.content, defaultAccess: page.defaultAccess })),
      characters: sheets.map((sheet) => ({ ref: sheet.id, name: sheet.name, sheet: sheet.sheet, defaultAccess: sheet.defaultAccess })),
      compendium: homebrew.map((entry) => ({
        ref: entry.id,
        kind: entry.kind,
        name: entry.name,
        summary: entry.summary,
        lang: entry.lang,
        meta: entry.meta,
        body: entry.body,
        data: entry.data,
        published: entry.published
      })),
      srd: Object.fromEntries(srd.filter((row) => row.slug).map((row) => [row.id, row.slug!])),
      scenes: sceneRows.map((scene) => ({
        name: scene.name,
        sortOrder: scene.sortOrder,
        active: scene.active,
        settings: scene.settings,
        explored: scene.explored,
        items: items
          .filter((item) => item.sceneId === scene.id)
          .map((item) => ({
            layer: item.layer,
            kind: item.kind,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation,
            flipX: item.flipX,
            flipY: item.flipY,
            locked: item.locked,
            z: item.z,
            data: item.data
          }))
      })),
      handouts: notes.map((note) => ({ title: note.title, kind: note.kind, body: note.body, asset: note.assetId })),
      jukebox: music ? { asset: music.assetId, loop: music.loop, volume: music.volume } : null
    }
  }

  async importCampaign(userId: string, input: CampaignImport, name?: string): Promise<CampaignDto> {
    const decoded = input.assets.map((asset) => {
      const data = Buffer.from(asset.data, 'base64')
      if (sniffMime(data) !== asset.mime) throw new BadRequestException(`O arquivo ${asset.name} não é o que diz ser`)
      return { ...asset, data }
    })

    const campaignId = await this.db.transaction(async (tx) => {
      const [campaign] = await tx
        .insert(campaigns)
        .values({
          name: (name ?? input.campaign.name).slice(0, 80),
          description: input.campaign.description,
          system: input.campaign.system,
          ownerId: userId,
          inviteCode: newInviteCode()
        })
        .returning({ id: campaigns.id })
      const id = campaign!.id
      await tx.insert(campaignMembers).values({ campaignId: id, userId, role: 'gm' })

      const refs = new Map<string, string>()
      for (const asset of decoded) {
        const row = await this.assets.store(id, userId, { name: asset.name, kind: asset.kind, mime: asset.mime, data: asset.data }, tx)
        refs.set(asset.ref, row.id)
      }
      for (const entry of input.compendium) {
        const { ref, ...values } = entry
        const [row] = await tx
          .insert(compendiumEntries)
          .values({ ...values, system: 'dnd5e', campaignId: id, authorId: userId })
          .returning({ id: compendiumEntries.id })
        refs.set(ref, row!.id)
      }
      const slugs = Object.values(input.srd)
      if (slugs.length) {
        const found = await tx
          .select({ id: compendiumEntries.id, slug: compendiumEntries.slug })
          .from(compendiumEntries)
          .where(and(inArray(compendiumEntries.slug, slugs), isNull(compendiumEntries.campaignId)))
        const bySlug = new Map(found.map((row) => [row.slug, row.id]))
        for (const [ref, slug] of Object.entries(input.srd)) {
          const target = bySlug.get(slug)
          if (target) refs.set(ref, target)
        }
      }
      for (const character of input.characters) {
        const [row] = await tx
          .insert(characters)
          .values({ campaignId: id, ownerId: userId, name: character.name, sheet: character.sheet, defaultAccess: character.defaultAccess })
          .returning({ id: characters.id })
        refs.set(character.ref, row!.id)
      }
      if (input.journals.length)
        await tx.insert(journals).values(input.journals.map((page) => ({ ...page, campaignId: id, authorId: userId })))

      let activeTaken = false
      for (const scene of input.scenes) {
        const active: boolean = scene.active && !activeTaken
        activeTaken ||= active
        const [row] = await tx
          .insert(scenes)
          .values({
            campaignId: id,
            name: scene.name,
            sortOrder: scene.sortOrder,
            active,
            settings: scene.settings,
            explored: scene.explored
          })
          .returning({ id: scenes.id })
        if (scene.items.length)
          await tx.insert(sceneItems).values(
            scene.items.map((item) => ({
              ...item,
              sceneId: row!.id,
              ownerId: null,
              createdBy: userId,
              data: this.relink(item.data, refs)
            }))
          )
      }
      if (input.handouts.length)
        await tx.insert(handouts).values(
          input.handouts.map((note) => ({
            campaignId: id,
            title: note.title,
            kind: note.kind,
            body: note.body,
            assetId: note.asset ? (refs.get(note.asset) ?? null) : null,
            sharedWith: 'none' as const
          }))
        )
      const track = input.jukebox?.asset ? refs.get(input.jukebox.asset) : undefined
      if (input.jukebox && track)
        await tx
          .insert(jukebox)
          .values({ campaignId: id, assetId: track, playing: false, position: 0, loop: input.jukebox.loop, volume: input.jukebox.volume })
      return id
    })
    return this.campaigns.get(campaignId, userId)
  }

  private relink(data: Record<string, unknown>, refs: Map<string, string>): Record<string, unknown> {
    const out = { ...data }
    for (const key of LINKS) {
      const value = out[key]
      if (typeof value !== 'string') continue
      const target = refs.get(value)
      if (target) out[key] = target
      else delete out[key]
    }
    return out
  }
}
