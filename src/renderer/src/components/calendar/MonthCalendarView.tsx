import React from 'react'
import { Paperclip, Plus } from 'lucide-react'
import { CalendarMonthGrid, CalendarDayCell } from '../../../../core/calendar/types'
import { EventWithDetails } from '@shared/types'

interface MonthCalendarViewProps {
  grid: CalendarMonthGrid
  onDayClick: (date: Date) => void
  onEventClick: (event: EventWithDetails) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  grid,
  onDayClick,
  onEventClick
}) => {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 py-2">
        {WEEKDAYS.map((day, idx) => (
          <div key={day} className={idx >= 5 ? 'text-blue-600/80' : ''}>
            {day}
          </div>
        ))}
      </div>

      {/* 42 Day Cells Grid (6 rows of 7 columns) */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100 overflow-y-auto">
        {grid.days.map((dayCell) => (
          <DayCellItem
            key={dayCell.isoDateString}
            day={dayCell}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

interface DayCellItemProps {
  day: CalendarDayCell
  onDayClick: (date: Date) => void
  onEventClick: (event: EventWithDetails) => void
}

const DayCellItem: React.FC<DayCellItemProps> = ({ day, onDayClick, onEventClick }) => {
  const MAX_VISIBLE_EVENTS = 3
  const visibleEvents = day.events.slice(0, MAX_VISIBLE_EVENTS)
  const remainingCount = day.events.length - MAX_VISIBLE_EVENTS

  return (
    <div
      onClick={() => onDayClick(day.date)}
      className={`group relative flex flex-col p-1.5 transition select-none cursor-pointer min-h-[95px] ${
        !day.isCurrentMonth
          ? 'bg-slate-50/60 text-slate-400'
          : day.isWeekend
            ? 'bg-slate-50/20 text-slate-800'
            : 'bg-white text-slate-800'
      } hover:bg-blue-50/20`}
    >
      {/* Day Header (Number & Quick Add) */}
      <div className="flex items-center justify-between">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            day.isToday
              ? 'bg-blue-600 text-white shadow-2xs font-bold'
              : !day.isCurrentMonth
                ? 'text-slate-400'
                : 'text-slate-700'
          }`}
        >
          {day.dayNumber}
        </span>

        {/* Quick Add Icon on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDayClick(day.date)
          }}
          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          title="Aggiungi evento qui"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Events List for this Day */}
      <div className="mt-1 flex flex-1 flex-col gap-1 overflow-hidden">
        {visibleEvents.map((evt) => {
          const primaryTag = evt.tags[0]
          const tagColor = primaryTag ? primaryTag.colorHex : '#3B82F6'

          return (
            <div
              key={evt.id}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(evt)
              }}
              className="group/card flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition shadow-2xs hover:brightness-95 hover:shadow-xs"
              style={{
                backgroundColor: `${tagColor}1C`,
                color: tagColor,
                borderLeft: `3px solid ${tagColor}`
              }}
              title={`${evt.title}${evt.attachments?.length ? ` (${evt.attachments.length} allegati)` : ''}`}
            >
              <span className="truncate flex-1 text-slate-800 text-[10px] font-semibold">
                {evt.title}
              </span>

              {/* Local Attachment Indicator (Story 09) */}
              {evt.attachments && evt.attachments.length > 0 && (
                <span
                  className="shrink-0 text-slate-500 flex items-center gap-0.5 text-[9px]"
                  title={`${evt.attachments.length} allegati locali`}
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  {evt.attachments.length > 1 && evt.attachments.length}
                </span>
              )}
            </div>
          )
        })}

        {remainingCount > 0 && (
          <span className="text-[10px] font-medium text-slate-400 pl-1">
            +{remainingCount} altri...
          </span>
        )}
      </div>
    </div>
  )
}
