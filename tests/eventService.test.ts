import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'
import { initDatabase, closeDatabase } from '../src/main/db'
import { events, tags } from '../src/main/db/schema'
import {
  createEvent,
  getEventsByDateRange,
  getEventById,
  updateEvent,
  deleteEvent
} from '../src/main/services/event.service'
import { createTag } from '../src/main/services/tag.service'
import { EventValidationError } from '../src/core/events/validators'

const TEST_DB_PATH = join(process.cwd(), 'data', 'test_event_service.sqlite')

describe('Story 06, 07, 09 - Event Service (CRUD & Relations)', () => {
  beforeEach(async () => {
    const { db } = await initDatabase(TEST_DB_PATH)
    await db.delete(events)
    await db.delete(tags)
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

  it('should create a simple event and assign tags', async () => {
    const tag1 = await createTag({ name: 'Design', colorHex: '#EC4899' })

    const created = await createEvent({
      type: 'simple',
      title: 'Figma Review',
      description: 'Review color tokens',
      startDate: '2026-11-10T14:00:00',
      tagIds: [tag1.id]
    })

    expect(created.id).toBeDefined()
    expect(created.type).toBe('simple')
    expect(created.title).toBe('Figma Review')
    expect(created.tags).toHaveLength(1)
    expect(created.tags[0].name).toBe('Design')
    expect(created.attachments).toHaveLength(0)
  })

  it('should create an event with local attachments', async () => {
    const created = await createEvent({
      type: 'attachment',
      title: 'Final Video Export',
      startDate: '2026-11-12T16:00:00',
      attachments: [
        {
          filePath: 'C:/Render/final_v1.mp4',
          fileName: 'final_v1.mp4',
          fileExtension: '.mp4'
        }
      ]
    })

    expect(created.type).toBe('attachment')
    expect(created.attachments).toHaveLength(1)
    expect(created.attachments[0].fileName).toBe('final_v1.mp4')
  })

  it('should retrieve events by date range', async () => {
    await createEvent({
      type: 'simple',
      title: 'Inside Range Event',
      startDate: '2026-11-10T10:00:00'
    })

    await createEvent({
      type: 'simple',
      title: 'Outside Range Event',
      startDate: '2026-12-25T10:00:00'
    })

    const found = await getEventsByDateRange('2026-11-01', '2026-11-30')
    expect(found).toHaveLength(1)
    expect(found[0].title).toBe('Inside Range Event')
  })

  it('should update event details, tags, and attachments', async () => {
    const tag1 = await createTag({ name: 'Tag One', colorHex: '#10B981' })
    const tag2 = await createTag({ name: 'Tag Two', colorHex: '#3B82F6' })

    const event = await createEvent({
      type: 'simple',
      title: 'Original Title',
      startDate: '2026-11-10T10:00:00',
      tagIds: [tag1.id]
    })

    const updated = await updateEvent(event.id, {
      title: 'Updated Title',
      tagIds: [tag2.id],
      attachments: [
        {
          filePath: '/Users/test/doc.pdf',
          fileName: 'doc.pdf',
          fileExtension: '.pdf'
        }
      ]
    })

    expect(updated.title).toBe('Updated Title')
    expect(updated.type).toBe('attachment')
    expect(updated.tags).toHaveLength(1)
    expect(updated.tags[0].name).toBe('Tag Two')
    expect(updated.attachments).toHaveLength(1)
  })

  it('should delete event and return true', async () => {
    const event = await createEvent({
      type: 'simple',
      title: 'To Delete',
      startDate: '2026-11-10T10:00:00'
    })

    const deleted = await deleteEvent(event.id)
    expect(deleted).toBe(true)

    const fetched = await getEventById(event.id)
    expect(fetched).toBeNull()
  })

  it('should reject invalid dates (end before start)', async () => {
    await expect(
      createEvent({
        type: 'simple',
        title: 'Invalid',
        startDate: '2026-11-10T12:00:00',
        endDate: '2026-11-10T10:00:00'
      })
    ).rejects.toThrow(EventValidationError)
  })
})
