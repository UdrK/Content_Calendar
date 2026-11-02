import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../src/main/db'
import { tags, events, eventTags, eventAttachments } from '../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('Story 02 - SQLite Database & Drizzle ORM', () => {
  beforeEach(async () => {
    closeDatabase()
  })

  afterEach(() => {
    closeDatabase()
  })

  it('should initialize database and create all required tables', async () => {
    const { client } = await initDatabase(':memory:')
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )

    const tableNames = tables.rows.map((t) => t.name as string).sort()
    expect(tableNames).toContain('events')
    expect(tableNames).toContain('tags')
    expect(tableNames).toContain('event_tags')
    expect(tableNames).toContain('event_attachments')
  })

  it('should insert and retrieve tags using Drizzle ORM', async () => {
    const { db } = await initDatabase(':memory:')

    await db.insert(tags).values({
      id: 'tag-1',
      name: 'YouTube',
      colorHex: '#FF0000'
    })

    const allTags = await db.select().from(tags)
    expect(allTags).toHaveLength(1)
    expect(allTags[0].name).toBe('YouTube')
    expect(allTags[0].colorHex).toBe('#FF0000')
  })

  it('should insert event and cascade delete attachments and tags on event deletion', async () => {
    const { db } = await initDatabase(':memory:')

    // Insert Tag
    await db.insert(tags).values({
      id: 'tag-work',
      name: 'Work',
      colorHex: '#3B82F6'
    })

    // Insert Event
    await db.insert(events).values({
      id: 'evt-1',
      type: 'attachment',
      title: 'Video Editing',
      description: 'Edit final draft',
      date: '2026-11-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Associate Event with Tag
    await db.insert(eventTags).values({
      eventId: 'evt-1',
      tagId: 'tag-work'
    })

    // Add Attachment
    await db.insert(eventAttachments).values({
      id: 'att-1',
      eventId: 'evt-1',
      filePath: 'C:/Videos/intro.mp4',
      fileName: 'intro.mp4',
      fileExtension: '.mp4',
      addedAt: new Date().toISOString()
    })

    // Verify relations exist
    const associatedTags = await db.select().from(eventTags).where(eq(eventTags.eventId, 'evt-1'))
    expect(associatedTags).toHaveLength(1)

    const attachments = await db
      .select()
      .from(eventAttachments)
      .where(eq(eventAttachments.eventId, 'evt-1'))
    expect(attachments).toHaveLength(1)
    expect(attachments[0].fileName).toBe('intro.mp4')

    // Cascade delete: delete the event
    await db.delete(events).where(eq(events.id, 'evt-1'))

    // Verify event is deleted
    const remainingEvents = await db.select().from(events).where(eq(events.id, 'evt-1'))
    expect(remainingEvents).toHaveLength(0)

    // Verify attachments are deleted via ON DELETE CASCADE
    const remainingAttachments = await db
      .select()
      .from(eventAttachments)
      .where(eq(eventAttachments.eventId, 'evt-1'))
    expect(remainingAttachments).toHaveLength(0)

    // Verify event_tags relation is deleted
    const remainingEventTags = await db
      .select()
      .from(eventTags)
      .where(eq(eventTags.eventId, 'evt-1'))
    expect(remainingEventTags).toHaveLength(0)

    // Verify the tag itself still exists
    const remainingTag = await db.select().from(tags).where(eq(tags.id, 'tag-work'))
    expect(remainingTag).toHaveLength(1)
  })

  it('should migrate legacy tables with start_date without constraint errors on new inserts', async () => {
    const { client, db } = await initDatabase(':memory:')

    // Create legacy table structure with start_date NOT NULL
    await client.executeMultiple(`
      DROP TABLE IF EXISTS events;
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_all_day INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO events VALUES ('old-1', 'simple', 'Old Task', null, '2026-11-05T12:00:00', null, 0, null, '2026', '2026');
    `)

    // Simulate migration logic
    const tableInfo = await client.execute("PRAGMA table_info('events');")
    const columnNames = tableInfo.rows.map((r: any) => String(r.name))
    if (!columnNames.includes('date')) {
      await client.execute('ALTER TABLE events ADD COLUMN date TEXT;')
      await client.execute(
        "UPDATE events SET date = substr(start_date, 1, 10) WHERE date IS NULL OR date = '';"
      )
    }
    if (!columnNames.includes('is_done')) {
      await client.execute('ALTER TABLE events ADD COLUMN is_done INTEGER NOT NULL DEFAULT 0;')
    }
    if (columnNames.includes('start_date')) {
      await client.execute('ALTER TABLE events DROP COLUMN start_date;')
    }
    if (columnNames.includes('end_date')) {
      await client.execute('ALTER TABLE events DROP COLUMN end_date;')
    }
    if (columnNames.includes('is_all_day')) {
      await client.execute('ALTER TABLE events DROP COLUMN is_all_day;')
    }

    // Check old record converted
    const existing = await db.select().from(events)
    expect(existing).toHaveLength(1)
    expect(existing[0].date).toBe('2026-11-05')

    // Inserting new event with ONLY date must succeed (no NOT NULL constraint on start_date)
    await db.insert(events).values({
      id: 'new-2',
      type: 'simple',
      title: 'New Task',
      date: '2026-11-06',
      createdAt: '2026',
      updatedAt: '2026'
    })

    const all = await db.select().from(events)
    expect(all).toHaveLength(2)
  })
})
