import { describe, it, expect } from 'vitest'
import { EventFactory } from '../src/core/events/EventFactory'
import { SimpleEvent } from '../src/core/events/SimpleEvent'
import { LocalAttachmentEvent } from '../src/core/events/LocalAttachmentEvent'
import { EventValidationError } from '../src/core/events/validators'
import { EventWithDetails } from '../src/shared/types'

describe('Story 06 & 09 - Event Domain Models & Factory (Headless Core)', () => {
  const baseRecord: EventWithDetails = {
    id: 'evt-101',
    type: 'simple',
    title: 'Content Review',
    description: 'Review copy and artwork',
    date: '2026-11-05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [{ id: 't-1', name: 'Blog', colorHex: '#3B82F6' }],
    attachments: []
  }

  it('should instantiate SimpleEvent via EventFactory', () => {
    const event = EventFactory.create(baseRecord)
    expect(event).toBeInstanceOf(SimpleEvent)
    expect(event.title).toBe('Content Review')
    expect(event.date).toBe('2026-11-05')
    expect(event.hasAttachments()).toBe(false)
    expect(() => event.validate()).not.toThrow()
  })

  it('should instantiate LocalAttachmentEvent and manage attachments', () => {
    const attachmentRecord: EventWithDetails = {
      ...baseRecord,
      id: 'evt-att',
      type: 'attachment',
      attachments: [
        {
          id: 'att-1',
          eventId: 'evt-att',
          filePath: 'C:/Files/video.mp4',
          fileName: 'video.mp4',
          fileExtension: '.mp4',
          addedAt: new Date().toISOString()
        }
      ]
    }

    const event = EventFactory.create(attachmentRecord)
    expect(event).toBeInstanceOf(LocalAttachmentEvent)
    expect(event.hasAttachments()).toBe(true)

    const attEvent = event as LocalAttachmentEvent
    expect(attEvent.getAttachmentPaths()).toEqual(['C:/Files/video.mp4'])

    // Remove attachment
    attEvent.removeAttachment('att-1')
    expect(attEvent.hasAttachments()).toBe(false)
  })

  it('should throw EventValidationError for invalid title or date', () => {
    const invalidTitle = EventFactory.create({
      ...baseRecord,
      title: '   '
    })
    expect(() => invalidTitle.validate()).toThrow(EventValidationError)

    const invalidDate = EventFactory.create({
      ...baseRecord,
      date: 'not-a-valid-date'
    })
    expect(() => invalidDate.validate()).toThrow(EventValidationError)
  })
})
