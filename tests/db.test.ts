import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'
import { initDatabase, closeDatabase } from '../src/main/db'
import { tags, events, eventTags, eventAttachments } from '../src/main/db/schema'
import { eq } from 'drizzle-orm'

const TEST_DB_PATH = join(process.cwd(), 'data', 'test_calendar.sqlite')

describe('Story 02 - SQLite Database & Drizzle ORM', () => {
  beforeEach(async () => {
    closeDatabase()
    if (existsSync(TEST_DB_PATH)) {
      try {
        unlinkSync(TEST_DB_PATH)
      } catch {
        // ignore
      }
    }
  })

  afterEach(() => {
    closeDatabase()
    if (existsSync(TEST_DB_PATH)) {
      try {
        unlinkSync(TEST_DB_PATH)
      } catch {
        // ignore
      }
    }
  })

  it('should initialize database and create all required tables', async () => {
    const { client } = await initDatabase(TEST_DB_PATH)
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
    const { db } = await initDatabase(TEST_DB_PATH)

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
    const { db } = await initDatabase(TEST_DB_PATH)

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
      startDate: '2026-11-01T10:00:00Z',
      endDate: '2026-11-01T12:00:00Z',
      isAllDay: false,
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
})
