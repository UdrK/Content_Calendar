import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns
} from 'lucide-react'
import { TagRecord } from '@shared/types'

interface CalendarHeaderProps {
  title: string
  currentView: 'month' | 'week'
  onViewChange: (view: 'month' | 'week') => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onNewEvent: () => void
  tags: TagRecord[]
  activeTagIds: string[]
  onToggleTagFilter: (tagId: string) => void
  onClearFilters: () => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  title,
  currentView,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  tags,
  activeTagIds,
  onToggleTagFilter,
  onClearFilters
}) => {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-3 shadow-xs space-y-3">
      {/* Top Row: Navigation and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 min-w-[180px]">
            {title}
          </h2>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs">
            <button
              onClick={onPrev}
              className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition rounded-l-lg"
              title="Precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={onToday}
              className="border-x border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Oggi
            </button>
            <button
              onClick={onNext}
              className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition rounded-r-lg"
              title="Successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher (Month / Week) */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 text-xs font-medium shadow-2xs">
            <button
              onClick={() => onViewChange('month')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                currentView === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Mese
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition ${
                currentView === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Settimana
            </button>
          </div>

          {/* New Event Button */}
          <button
            onClick={onNewEvent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nuovo Evento
          </button>
        </div>
      </div>

      {/* Bottom Row: Tag Filters Bar (Story 10) */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            <Filter className="h-3 w-3" /> Filtra:
          </span>

          <button
            onClick={onClearFilters}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              activeTagIds.length === 0
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tutti
          </button>

          {tags.map((tag) => {
            const isActive = activeTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => onToggleTagFilter(tag.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition border ${
                  isActive
                    ? 'ring-2 ring-offset-1 font-semibold'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${tag.colorHex}18`,
                  color: tag.colorHex,
                  borderColor: `${tag.colorHex}50`,
                  ...(isActive ? { ringColor: tag.colorHex } : {})
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.colorHex }}
                />
                <span>{tag.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
