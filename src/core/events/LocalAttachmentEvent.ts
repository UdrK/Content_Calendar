import { BaseEvent } from './BaseEvent'
import { EventWithDetails, AttachmentRecord } from '../../shared/types'

export class LocalAttachmentEvent extends BaseEvent {
  constructor(record: EventWithDetails) {
    super(record)
  }

  public getAttachmentPaths(): string[] {
    return this.attachments.map((att) => att.filePath)
  }

  public addAttachment(attachment: AttachmentRecord): void {
    const exists = this.attachments.some((a) => a.filePath === attachment.filePath)
    if (!exists) {
      this.attachments.push(attachment)
    }
  }

  public removeAttachment(id: string): void {
    this.attachments = this.attachments.filter((a) => a.id !== id)
  }
}
