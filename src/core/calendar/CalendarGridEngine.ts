import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isWeekend,
  addDays
} from 'date-fns'
import { it } from 'date-fns/locale'
import { EventWithDetails } from '../../shared/types'
import { CalendarDayCell, CalendarMonthGrid, CalendarWeekGrid } from './types'

export class CalendarGridEngine {
  /**
   * Sorts events: alphabetically by title, then creation date
   */
  public static sortEvents(events: EventWithDetails[]): EventWithDetails[] {
    return [...events].sort((a, b) => {
      const titleCompare = a.title.localeCompare(b.title)
      if (titleCompare !== 0) return titleCompare
      return (a.createdAt || '').localeCompare(b.createdAt || '')
    })
  }

  /**
   * Checks if an event is active on a given day (Date object)
   * Matches event date (YYYY-MM-DD) with target day
   */
  public static isEventOnDay(event: EventWithDetails, targetDate: Date): boolean {
    const targetIso = format(targetDate, 'yyyy-MM-dd')
    const eventDate = event.date?.slice(0, 10)
    return eventDate === targetIso
  }

  /**
   * Builds the complete 42-day month grid (6 weeks of 7 days, starting on Monday)
   */
  public static buildMonthMatrix(
    year: number,
    month: number, // 1 to 12
    events: EventWithDetails[] = [],
    todayDate: Date = new Date()
  ): CalendarMonthGrid {
    const targetDate = new Date(year, month - 1, 1)
    const monthStart = startOfMonth(targetDate)
    const monthEnd = endOfMonth(targetDate)

    // Week starts on Monday (1)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    // Ensure we always have exactly 42 days (6 weeks) for a consistent layout
    const initialEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    let calendarDays = eachDayOfInterval({ start: calendarStart, end: initialEnd })

    if (calendarDays.length < 42) {
      const remainingDaysCount = 42 - calendarDays.length
      const lastDay = calendarDays[calendarDays.length - 1]
      const extraDays = eachDayOfInterval({
        start: addDays(lastDay, 1),
        end: addDays(lastDay, remainingDaysCount)
      })
      calendarDays = [...calendarDays, ...extraDays]
    } else if (calendarDays.length > 42) {
      calendarDays = calendarDays.slice(0, 42)
    }

    const monthNameCapitalized =
      format(monthStart, 'MMMM yyyy', { locale: it }).charAt(0).toUpperCase() +
      format(monthStart, 'MMMM yyyy', { locale: it }).slice(1)

    let totalEventsCount = 0

    const dayCells: CalendarDayCell[] = calendarDays.map((date) => {
      const isoDateString = format(date, 'yyyy-MM-dd')
      const dayEvents = events.filter((evt) => this.isEventOnDay(evt, date))
      const sortedEvents = this.sortEvents(dayEvents)
      totalEventsCount += sortedEvents.length

      return {
        date,
        isoDateString,
        dayNumber: date.getDate(),
        isCurrentMonth: isSameMonth(date, monthStart),
        isToday: isSameDay(date, todayDate),
        isWeekend: isWeekend(date),
        events: sortedEvents
      }
    })

    // Group into 6 weeks of 7 days
    const weeks: CalendarDayCell[][] = []
    for (let i = 0; i < dayCells.length; i += 7) {
      weeks.push(dayCells.slice(i, i + 7))
    }

    return {
      year,
      month,
      monthName: monthNameCapitalized,
      weeks,
      days: dayCells,
      startDate: dayCells[0].date,
      endDate: dayCells[dayCells.length - 1].date,
      totalEventsCount
    }
  }

  /**
   * Builds the 7-day week grid for a given reference date
   */
  public static buildWeekMatrix(
    date: Date,
    events: EventWithDetails[] = [],
    todayDate: Date = new Date()
  ): CalendarWeekGrid {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const dayCells: CalendarDayCell[] = weekDays.map((d) => {
      const isoDateString = format(d, 'yyyy-MM-dd')
      const dayEvents = events.filter((evt) => this.isEventOnDay(evt, d))

      return {
        date: d,
        isoDateString,
        dayNumber: d.getDate(),
        isCurrentMonth: true,
        isToday: isSameDay(d, todayDate),
        isWeekend: isWeekend(d),
        events: this.sortEvents(dayEvents)
      }
    })

    const weekNumber = Number(format(date, 'w'))

    return {
      year: date.getFullYear(),
      weekNumber,
      startDate: weekStart,
      endDate: weekEnd,
      days: dayCells
    }
  }
}
