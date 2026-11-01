import { BaseEvent } from './BaseEvent'
import { SimpleEvent } from './SimpleEvent'
import { LocalAttachmentEvent } from './LocalAttachmentEvent'
import { EventWithDetails } from '../../shared/types'

export class EventFactory {
  public static create(record: EventWithDetails): BaseEvent {
    switch (record.type) {
      case 'attachment':
        return new LocalAttachmentEvent(record)
      case 'simple':
      default:
        return new SimpleEvent(record)
    }
  }

  public static createMany(records: EventWithDetails[]): BaseEvent[] {
    return records.map((r) => this.create(r))
  }
}
