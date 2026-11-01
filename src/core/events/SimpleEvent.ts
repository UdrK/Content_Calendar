import { BaseEvent } from './BaseEvent'
import { EventWithDetails } from '../../shared/types'

export class SimpleEvent extends BaseEvent {
  constructor(record: EventWithDetails) {
    super(record)
  }

  public override validate(): void {
    super.validate()
  }
}
