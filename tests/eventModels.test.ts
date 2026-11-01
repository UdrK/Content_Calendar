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
    startDate: '2026-11-05T10:00:00',
    endDate: '2026-11-05T11:00:00',
    isAllDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [{ id: 't-1', name: 'Blog', colorHex: '#3B82F6' }],
    attachments: []
  }

  it('should instantiate SimpleEvent via EventFactory', () => {
    const event = EventFactory.create(baseRecord)
    expect(event).toBeInstanceOf(SimpleEvent)
    expect(event.title).toBe('Content Review')
    expect(event.isMultiDay()).toBe(false)
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

  it('should detect multi-day events correctly', () => {
    const multiDay = EventFactory.create({
      ...baseRecord,
      startDate: '2026-11-05T10:00:00',
      endDate: '2026-11-07T18:00:00'
    })
    expect(multiDay.isMultiDay()).toBe(true)
  })

  it('should throw EventValidationError for invalid title or dates', () => {
    const invalidTitle = EventFactory.create({
      ...baseRecord,
      title: '   '
    })
    expect(() => invalidTitle.validate()).toThrow(EventValidationError)

    const invalidDates = EventFactory.create({
      ...baseRecord,
      startDate: '2026-11-05T12:00:00',
      endDate: '2026-11-05T10:00:00' // end before start
    })
    expect(() => invalidDates.validate()).toThrow(EventValidationError)
  })
})
