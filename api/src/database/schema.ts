import { relations } from 'drizzle-orm'
import type { RollResult } from '@taverna/dice'
import type { Sheet5e } from '@taverna/rules-5e'
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import type {
  AccessLevel,
  AssetMime,
  CompendiumKind,
  Role,
  RollVisibility,
  RuleSystemId,
  SceneItemKind,
  SceneLayer,
  SceneSettings
} from '@taverna/shared'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  color: text('color').notNull().default('#c58b3a'),
  createdAt: createdAt()
})

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  system: text('system').$type<RuleSystemId>().notNull().default('dnd5e'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  inviteCode: text('invite_code').unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
})

export const campaignMembers = pgTable(
  'campaign_members',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').$type<Role>().notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.campaignId, table.userId] }), index('campaign_members_user_idx').on(table.userId)]
)

export const journals = pgTable(
  'journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    folder: text('folder').notNull().default(''),
    content: text('content').notNull().default(''),
    defaultAccess: text('default_access').$type<AccessLevel>().notNull().default('none'),
    grants: jsonb('grants').$type<Record<string, AccessLevel>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [index('journals_campaign_idx').on(table.campaignId)]
)

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    sheet: jsonb('sheet').$type<Sheet5e>().notNull(),
    version: integer('version').notNull().default(1),
    defaultAccess: text('default_access').$type<AccessLevel>().notNull().default('view'),
    grants: jsonb('grants').$type<Record<string, AccessLevel>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [index('characters_campaign_idx').on(table.campaignId)]
)

export const compendiumEntries = pgTable(
  'compendium_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    system: text('system').$type<RuleSystemId>().notNull().default('dnd5e'),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').$type<CompendiumKind>().notNull(),
    slug: text('slug'),
    name: text('name').notNull(),
    summary: text('summary').notNull().default(''),
    lang: text('lang').notNull().default('pt-BR'),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    body: text('body').notNull().default(''),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    published: boolean('published').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex('compendium_slug_idx').on(table.system, table.slug),
    index('compendium_kind_name_idx').on(table.system, table.kind, table.name),
    index('compendium_campaign_idx').on(table.campaignId)
  ]
)

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea'
})

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    uploaderId: uuid('uploader_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    mime: text('mime').$type<AssetMime>().notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt()
  },
  (table) => [index('assets_campaign_idx').on(table.campaignId)]
)

export const assetBlobs = pgTable('asset_blobs', {
  assetId: uuid('asset_id')
    .primaryKey()
    .references(() => assets.id, { onDelete: 'cascade' }),
  data: bytea('data').notNull()
})

export const scenes = pgTable(
  'scenes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(false),
    settings: jsonb('settings').$type<SceneSettings>().notNull(),
    explored: text('explored'),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [index('scenes_campaign_idx').on(table.campaignId)]
)

export const sceneItems = pgTable(
  'scene_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    layer: text('layer').$type<SceneLayer>().notNull(),
    kind: text('kind').$type<SceneItemKind>().notNull(),
    x: doublePrecision('x').notNull(),
    y: doublePrecision('y').notNull(),
    width: doublePrecision('width').notNull(),
    height: doublePrecision('height').notNull(),
    rotation: doublePrecision('rotation').notNull().default(0),
    flipX: boolean('flip_x').notNull().default(false),
    flipY: boolean('flip_y').notNull().default(false),
    locked: boolean('locked').notNull().default(false),
    z: integer('z').notNull().default(0),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [index('scene_items_scene_idx').on(table.sceneId)]
)

export const rolls = pgTable(
  'rolls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default(''),
    visibility: text('visibility').$type<RollVisibility>().notNull().default('public'),
    result: jsonb('result').$type<RollResult>().notNull(),
    createdAt: createdAt()
  },
  (table) => [index('rolls_campaign_created_idx').on(table.campaignId, table.createdAt)]
)

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(campaignMembers)
}))

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  members: many(campaignMembers),
  owner: one(users, { fields: [campaigns.ownerId], references: [users.id] })
}))

export const campaignMembersRelations = relations(campaignMembers, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignMembers.campaignId], references: [campaigns.id] }),
  user: one(users, { fields: [campaignMembers.userId], references: [users.id] })
}))
