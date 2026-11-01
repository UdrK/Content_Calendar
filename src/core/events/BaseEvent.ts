import { EventType, TagRecord, AttachmentRecord, EventWithDetails } from '../../shared/types'
import { validateEventTitle, validateEventDate } from './validators'

export abstract class BaseEvent {
  public readonly id: string
  public readonly type: EventType
  public title: string
  public description: string | null
  public date: string
  public tags: TagRecord[]
  public attachments: AttachmentRecord[]
  public readonly createdAt: string
  public updatedAt: string

  constructor(record: EventWithDetails) {
    this.id = record.id
    this.type = record.type
    this.title = record.title
    this.description = record.description ?? null
    this.date = record.date
    this.tags = record.tags ?? []
    this.attachments = record.attachments ?? []
    this.createdAt = record.createdAt
    this.updatedAt = record.updatedAt
  }

  public validate(): void {
    validateEventTitle(this.title)
    validateEventDate(this.date)
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
      date: this.date,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tags: this.tags,
      attachments: this.attachments
    }
  }
}
