import { relations } from 'drizzle-orm'
import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Role, RuleSystemId } from '@taverna/shared'

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
