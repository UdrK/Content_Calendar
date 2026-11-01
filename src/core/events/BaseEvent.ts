import { EventType, TagRecord, AttachmentRecord, EventWithDetails } from '../../shared/types'
import { validateEventTitle, validateEventDates } from './validators'

export abstract class BaseEvent {
  public readonly id: string
  public readonly type: EventType
  public title: string
  public description: string | null
  public startDate: string
  public endDate: string | null
  public isAllDay: boolean
  public tags: TagRecord[]
  public attachments: AttachmentRecord[]
  public readonly createdAt: string
  public updatedAt: string

  constructor(record: EventWithDetails) {
    this.id = record.id
    this.type = record.type
    this.title = record.title
    this.description = record.description ?? null
    this.startDate = record.startDate
    this.endDate = record.endDate ?? null
    this.isAllDay = record.isAllDay
    this.tags = record.tags ?? []
    this.attachments = record.attachments ?? []
    this.createdAt = record.createdAt
    this.updatedAt = record.updatedAt
  }

  public validate(): void {
    validateEventTitle(this.title)
    validateEventDates(this.startDate, this.endDate)
  }

  public isMultiDay(): boolean {
    if (!this.endDate) return false
    const startDay = this.startDate.slice(0, 10)
    const endDay = this.endDate.slice(0, 10)
    return startDay !== endDay
  }

  public hasAttachments(): boolean {
    return this.attachments.length > 0
  }

  public toJSON(): EventWithDetails {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      isAllDay: this.isAllDay,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tags: this.tags,
      attachments: this.attachments
    }
  }
}
