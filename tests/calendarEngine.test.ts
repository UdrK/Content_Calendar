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

  it('should assign single-day events to the exact day cell', () => {
    const sampleEvent: EventWithDetails = {
      id: 'e-1',
      type: 'simple',
      title: 'YouTube Launch',
      startDate: '2026-11-10T14:00:00',
      endDate: null,
      isAllDay: false,
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

  it('should sort all-day events before timed events, and timed events chronologically', () => {
    const timedLater: EventWithDetails = {
      id: 'e-timed-late',
      type: 'simple',
      title: 'Late Meeting',
      startDate: '2026-11-10T18:00:00',
      isAllDay: false,
      createdAt: '',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const allDayEvent: EventWithDetails = {
      id: 'e-allday',
      type: 'simple',
      title: 'National Holiday',
      startDate: '2026-11-10T00:00:00',
      isAllDay: true,
      createdAt: '',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const timedEarlier: EventWithDetails = {
      id: 'e-timed-early',
      type: 'simple',
      title: 'Early Standup',
      startDate: '2026-11-10T09:00:00',
      isAllDay: false,
      createdAt: '',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const grid = CalendarGridEngine.buildMonthMatrix(
      2026,
      11,
      [timedLater, allDayEvent, timedEarlier],
      dummyToday
    )

    const cell = grid.days.find((d) => d.isoDateString === '2026-11-10')!
    expect(cell.events).toHaveLength(3)
    expect(cell.events[0].title).toBe('National Holiday') // all day
    expect(cell.events[1].title).toBe('Early Standup') // 09:00
    expect(cell.events[2].title).toBe('Late Meeting') // 18:00
  })

  it('should support multi-day events across all covered days', () => {
    const multiDayEvent: EventWithDetails = {
      id: 'e-multi',
      type: 'simple',
      title: 'Campaign Week',
      startDate: '2026-11-12T09:00:00',
      endDate: '2026-11-14T18:00:00',
      isAllDay: true,
      createdAt: '',
      updatedAt: '',
      tags: [],
      attachments: []
    }

    const grid = CalendarGridEngine.buildMonthMatrix(2026, 11, [multiDayEvent], dummyToday)

    expect(grid.days.find((d) => d.isoDateString === '2026-11-11')?.events).toHaveLength(0)
    expect(grid.days.find((d) => d.isoDateString === '2026-11-12')?.events).toHaveLength(1)
    expect(grid.days.find((d) => d.isoDateString === '2026-11-13')?.events).toHaveLength(1)
    expect(grid.days.find((d) => d.isoDateString === '2026-11-14')?.events).toHaveLength(1)
    expect(grid.days.find((d) => d.isoDateString === '2026-11-15')?.events).toHaveLength(0)
  })

  it('should build a 7-day week matrix starting on Monday', () => {
    const weekGrid = CalendarGridEngine.buildWeekMatrix(new Date(2026, 10, 11), [], dummyToday)
    expect(weekGrid.days).toHaveLength(7)
    expect(weekGrid.days[0].date.getDay()).toBe(1) // Monday
    expect(weekGrid.days[6].date.getDay()).toBe(0) // Sunday
  })
})
