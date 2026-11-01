import { EventWithDetails } from '../../shared/types'

export interface CalendarDayCell {
  date: Date
  isoDateString: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  events: EventWithDetails[]
}

export interface CalendarMonthGrid {
  year: number
  month: number // 1-12
  monthName: string
  weeks: CalendarDayCell[][]
  days: CalendarDayCell[]
  startDate: Date
  endDate: Date
  totalEventsCount: number
}

export interface CalendarWeekGrid {
  year: number
  weekNumber: number
  startDate: Date
  endDate: Date
  days: CalendarDayCell[]
}
