import { describe, it, expect } from 'vitest'
import { EventFilterEngine } from '../src/core/filters/EventFilterEngine'
import { EventWithDetails } from '../src/shared/types'

describe('Story 10 - EventFilterEngine (Headless Core)', () => {
  const events: EventWithDetails[] = [
    {
      id: 'e-1',
      type: 'simple',
      title: 'YouTube Video Production',
      description: 'Record episode 5',
      startDate: '2026-11-10T10:00:00',
      isAllDay: false,
      createdAt: '',
      updatedAt: '',
      tags: [{ id: 'tag-yt', name: 'YouTube', colorHex: '#FF0000' }],
      attachments: []
    },
    {
      id: 'e-2',
      type: 'simple',
      title: 'Podcast Episode',
      description: 'Interview guest',
      startDate: '2026-11-11T14:00:00',
      isAllDay: false,
      createdAt: '',
      updatedAt: '',
      tags: [
        { id: 'tag-pod', name: 'Podcast', colorHex: '#8B5CF6' },
        { id: 'tag-urgent', name: 'Urgent', colorHex: '#EF4444' }
      ],
      attachments: []
    },
    {
      id: 'e-3',
      type: 'simple',
      title: 'Blog Newsletter Draft',
      description: 'Weekly digest',
      startDate: '2026-11-12T09:00:00',
      isAllDay: true,
      createdAt: '',
      updatedAt: '',
      tags: [{ id: 'tag-blog', name: 'Blog', colorHex: '#10B981' }],
      attachments: []
    }
  ]

  it('should return all events when no filters are set', () => {
    const filtered = EventFilterEngine.filter(events, {})
    expect(filtered).toHaveLength(3)
  })

  it('should filter events by active tag IDs (OR mode / some)', () => {
    const filtered = EventFilterEngine.filter(events, {
      activeTagIds: ['tag-yt', 'tag-blog']
    })
    expect(filtered).toHaveLength(2)
    const titles = filtered.map((e) => e.title)
    expect(titles).toContain('YouTube Video Production')
    expect(titles).toContain('Blog Newsletter Draft')
  })

  it('should filter events by active tag IDs (AND mode / every)', () => {
    const filtered = EventFilterEngine.filter(events, {
      activeTagIds: ['tag-pod', 'tag-urgent'],
      matchMode: 'every'
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Podcast Episode')
  })

  it('should filter events by search query in title or description', () => {
    const byTitle = EventFilterEngine.filter(events, { searchQuery: 'Podcast' })
    expect(byTitle).toHaveLength(1)
    expect(byTitle[0].id).toBe('e-2')

    const byDesc = EventFilterEngine.filter(events, { searchQuery: 'episode 5' })
    expect(byDesc).toHaveLength(1)
    expect(byDesc[0].id).toBe('e-1')
  })

  it('should combine tag filter and search query', () => {
    const combined = EventFilterEngine.filter(events, {
      activeTagIds: ['tag-yt', 'tag-pod'],
      searchQuery: 'interview'
    })
    expect(combined).toHaveLength(1)
    expect(combined[0].id).toBe('e-2')
  })
})
