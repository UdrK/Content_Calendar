import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  type: text('type').$type<'simple' | 'attachment'>().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  isDone: integer('is_done', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  colorHex: text('color_hex').notNull()
})

export const eventTags = sqliteTable(
  'event_tags',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' })
  },
  (table) => [primaryKey({ columns: [table.eventId, table.tagId] })]
)

export const eventAttachments = sqliteTable('event_attachments', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  fileExtension: text('file_extension').notNull(),
  addedAt: text('added_at').notNull()
})
