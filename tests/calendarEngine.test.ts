import { describe, it, expect } from 'vitest'
import { CalendarGridEngine } from '../src/core/calendar/CalendarGridEngine'
import { EventWithDetails } from '../src/shared/types'

describe('Story 05 - CalendarGridEngine (Headless Domain Core)', () => {
  const dummyToday = new Date(2026, 10, 15) // 15 Nov 2026

  it('should always generate exactly 42 days (6 weeks of 7 days)', () => {
    const nov2026 = CalendarGridEngine.buildMonthMatrix(2026, 11, [], dummyToday)
    expect(nov2026.days).toHaveLength(42)
    expect(nov2026.weeks).toHaveLength(6)
    nov2026.weeks.forEach((week) => expect(week).toHaveLength(7))

    const feb2024Leap = CalendarGridEngine.buildMonthMatrix(2024, 2, [], dummyToday)
    expect(feb2024Leap.days).toHaveLength(42)

    const feb2023Normal = CalendarGridEngine.buildMonthMatrix(2023, 2, [], dummyToday)
    expect(feb2023Normal.days).toHaveLength(42)
  })

  it('should start every week on Monday', () => {
    const grid = CalendarGridEngine.buildMonthMatrix(2026, 11, [], dummyToday)
    grid.weeks.forEach((week) => {
      expect(week[0].date.getDay()).toBe(1) // Monday
      expect(week[6].date.getDay()).toBe(0) // Sunday
    })
  })

  it('should correctly flag isCurrentMonth, isToday, and isWeekend', () => {
    const grid = CalendarGridEngine.buildMonthMatrix(2026, 11, [], dummyToday)

    const todayCell = grid.days.find((d) => d.isoDateString === '2026-11-15')
    expect(todayCell).toBeDefined()
    expect(todayCell?.isToday).toBe(true)
    expect(todayCell?.isCurrentMonth).toBe(true)
    expect(todayCell?.isWeekend).toBe(true) // Nov 15, 2026 is Sunday

    const otherCell = grid.days.find((d) => d.isoDateString === '2026-11-16')
    expect(otherCell?.isToday).toBe(false)
    expect(otherCell?.isWeekend).toBe(false) // Monday

    const paddingCell = grid.days.find((d) => d.isoDateString.startsWith('2026-10-'))
    if (paddingCell) {
      expect(paddingCell.isCurrentMonth).toBe(false)
    }
  })

  it('should assign single-day deadline events to the exact day cell', () => {
    const sampleEvent: EventWithDetails = {
      id: 'e-1',
      type: 'simple',
      title: 'YouTube Launch',
      date: '2026-11-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      attachments: []
    }

    const grid = CalendarGridEngine.buildMonthMatrix(2026, 11, [sampleEvent], dummyToday)
    const targetCell = grid.days.find((d) => d.isoDateString === '2026-11-10')
    expect(targetCell?.events).toHaveLength(1)
    expect(targetCell?.events[0].title).toBe('YouTube Launch')

    const otherCell = grid.days.find((d) => d.isoDateString === '2026-11-11')
    expect(otherCell?.events).toHaveLength(0)
  })

  it('should sort events alphabetically by title within a day', () => {
    const eventB: EventWithDetails = {
      id: 'e-b',
      type: 'simple',
      title: 'Beta Release',
      date: '2026-11-10',
      createdAt: '2026-11-01T00:00:00',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const eventA: EventWithDetails = {
      id: 'e-a',
      type: 'simple',
      title: 'Alpha Testing',
      date: '2026-11-10',
      createdAt: '2026-11-01T00:00:00',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const grid = CalendarGridEngine.buildMonthMatrix(
      2026,
      11,
      [eventB, eventA],
      dummyToday
    )

    const cell = grid.days.find((d) => d.isoDateString === '2026-11-10')!
    expect(cell.events).toHaveLength(2)
    expect(cell.events[0].title).toBe('Alpha Testing')
    expect(cell.events[1].title).toBe('Beta Release')
  })

  it('should build a 7-day week matrix starting on Monday', () => {
    const sampleEvent: EventWithDetails = {
      id: 'e-week',
      type: 'simple',
      title: 'Weekly Standup',
      date: '2026-11-11',
      createdAt: '',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const weekGrid = CalendarGridEngine.buildWeekMatrix(
      new Date(2026, 10, 11),
      [sampleEvent],
      dummyToday
    )
    expect(weekGrid.days).toHaveLength(7)
    expect(weekGrid.days[0].date.getDay()).toBe(1) // Monday
    expect(weekGrid.days[6].date.getDay()).toBe(0) // Sunday

    const targetDay = weekGrid.days.find((d) => d.isoDateString === '2026-11-11')
    expect(targetDay?.events).toHaveLength(1)
    expect(targetDay?.events[0].title).toBe('Weekly Standup')
  })
})
