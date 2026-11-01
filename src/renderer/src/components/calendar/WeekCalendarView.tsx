import React from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Paperclip, Plus } from 'lucide-react'
import { CalendarWeekGrid } from '../../../../core/calendar/types'
import { EventWithDetails } from '@shared/types'

interface WeekCalendarViewProps {
  grid: CalendarWeekGrid
  onDayClick: (date: Date) => void
  onEventClick: (event: EventWithDetails) => void
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  grid,
  onDayClick,
  onEventClick
}) => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* 7 Columns Grid */}
      <div className="grid flex-1 grid-cols-7 divide-x divide-slate-200 overflow-y-auto">
        {grid.days.map((day) => {
          const weekdayName = format(day.date, 'EEEE', { locale: it })
          const capitalizedWeekday =
            weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1)
          const formattedDate = format(day.date, 'd MMM', { locale: it })

          return (
            <div
              key={day.isoDateString}
              onClick={() => onDayClick(day.date)}
              className={`flex flex-col p-2.5 transition cursor-pointer group ${
                day.isToday ? 'bg-blue-50/20' : 'bg-white'
              } hover:bg-slate-50/80`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    {capitalizedWeekday}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      day.isToday ? 'text-blue-600' : 'text-slate-800'
                    }`}
                  >
                    {formattedDate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDayClick(day.date)
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                  title="Nuovo evento"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Day Events Stack */}
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
                {day.events.length === 0 ? (
                  <span className="text-[11px] text-slate-300 italic pt-2 text-center">
                    Nessun evento
                  </span>
                ) : (
                  day.events.map((evt) => {
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(evt)
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-100/90 p-2 text-xs transition shadow-2xs hover:bg-slate-200/80 hover:border-slate-300 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-semibold text-slate-800 leading-tight">
                            {evt.title}
                          </h4>

                          {evt.attachments && evt.attachments.length > 0 && (
                            <span
                              className="text-slate-400 shrink-0"
                              title={`${evt.attachments.length} allegati`}
                            >
                              <Paperclip className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                            {evt.description}
                          </p>
                        )}

                        {evt.tags && evt.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {evt.tags.map((t) => (
                              <span
                                key={t.id}
                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold border shadow-2xs"
                                style={{
                                  backgroundColor: `${t.colorHex}20`,
                                  color: t.colorHex,
                                  borderColor: `${t.colorHex}40`
                                }}
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
