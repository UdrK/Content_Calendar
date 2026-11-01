import { EventWithDetails } from '../../shared/types'

export interface EventFilterOptions {
  activeTagIds?: string[]
  searchQuery?: string
  matchMode?: 'some' | 'every'
}

export class EventFilterEngine {
  public static filter(
    events: EventWithDetails[],
    options: EventFilterOptions = {}
  ): EventWithDetails[] {
    const { activeTagIds = [], searchQuery, matchMode = 'some' } = options

    const trimmedQuery = searchQuery?.trim().toLowerCase()
    const hasTagFilter = activeTagIds.length > 0

    return events.filter((event) => {
      // 1. Tag filtering
      if (hasTagFilter) {
        const eventTagIds = event.tags.map((t) => t.id)
        if (matchMode === 'every') {
          const hasAll = activeTagIds.every((id) => eventTagIds.includes(id))
          if (!hasAll) return false
        } else {
          const hasSome = activeTagIds.some((id) => eventTagIds.includes(id))
          if (!hasSome) return false
        }
      }

      // 2. Text Search filtering
      if (trimmedQuery) {
        const titleMatch = event.title.toLowerCase().includes(trimmedQuery)
        const descMatch = event.description
          ? event.description.toLowerCase().includes(trimmedQuery)
          : false
        if (!titleMatch && !descMatch) return false
      }

      return true
    })
  }
}
