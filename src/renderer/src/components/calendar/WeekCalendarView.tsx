import React from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Paperclip, Plus } from 'lucide-react'
import { CalendarWeekGrid } from '../../../../core/calendar/types'
import { EventWithDetails } from '@shared/types'

interface WeekCalendarViewProps {
  grid: CalendarWeekGrid
  selectedEventId?: string | null
  onDayClick: (date: Date) => void
  onEventClick: (event: EventWithDetails) => void
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  grid,
  selectedEventId,
  onDayClick,
  onEventClick
}) => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/40">
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
                day.isToday ? 'bg-blue-50/35' : 'bg-transparent'
              } hover:bg-slate-100/50`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
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
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                  title="Nuovo evento"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Day Events Stack */}
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
                {day.events.length === 0 ? (
                  <span className="text-[11px] text-slate-300 italic pt-2 text-center select-none">
                    Nessun evento
                  </span>
                ) : (
                  day.events.map((evt) => {
                    const isDone = !!evt.isDone
                    const accentColor = isDone ? '#10B981' : '#EF4444'
                    const isSelected = selectedEventId === evt.id

                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(evt)
                        }}
                        className={`rounded-lg border p-2.5 text-xs transition cursor-pointer border-l-4 ${
                          isSelected
                            ? 'bg-slate-100 border-slate-300 shadow-xs'
                            : 'bg-white border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs'
                        }`}
                        style={{ borderLeftColor: accentColor }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h4
                            className={`font-semibold leading-tight break-words text-xs transition flex-1 min-w-0 ${
                              isDone ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}
                          >
                            {evt.title}
                          </h4>

                          {evt.attachments && evt.attachments.length > 0 && (
                            <span
                              className="text-slate-400 shrink-0 ml-1"
                              title={`${evt.attachments.length} allegati`}
                            >
                              <Paperclip className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p
                            className={`mt-1 text-[11px] line-clamp-2 leading-relaxed transition ${
                              isDone ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {evt.description}
                          </p>
                        )}

                        {evt.tags && evt.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {evt.tags.map((t) => (
                              <span
                                key={t.id}
                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold border shadow-2xs"
                                style={{
                                  backgroundColor: `${t.colorHex}18`,
                                  color: t.colorHex,
                                  borderColor: `${t.colorHex}35`
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
