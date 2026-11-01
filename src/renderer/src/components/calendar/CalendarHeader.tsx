import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  SlidersHorizontal,
  FilterX
} from 'lucide-react'
import { TagRecord } from '@shared/types'

interface CalendarHeaderProps {
  title: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onNewEvent: () => void
  onOpenTagManager: () => void
  tagsCount: number
  onRunDiagnostics: () => void
  tags: TagRecord[]
  activeTagIds: string[]
  onToggleTagFilter: (tagId: string) => void
  onClearFilters: () => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  title,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  onOpenTagManager,
  tagsCount,
  onRunDiagnostics,
  tags,
  activeTagIds,
  onToggleTagFilter,
  onClearFilters
}) => {
  return (
    <div className="border-b border-slate-200 bg-white shadow-2xs">
      {/* Top Bar: Icon + Week Date Range + Navigation Controls + Actions */}
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left: Icon (no bg, blue) + Week Date Range + Controls */}
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-blue-600 shrink-0" />

          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {title}
          </h2>

          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs ml-1">
            <button
              type="button"
              onClick={onPrev}
              className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition rounded-l-lg cursor-pointer"
              title="Settimana precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="border-x border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition rounded-r-lg cursor-pointer"
              title="Settimana successiva"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* New Event Button */}
          <button
            type="button"
            onClick={onNewEvent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nuova Scadenza</span>
          </button>

          {/* Tag Manager Button */}
          <button
            type="button"
            onClick={onOpenTagManager}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
          >
            <TagIcon className="h-3.5 w-3.5 text-blue-600" />
            <span>Tag</span>
            <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
              {tagsCount}
            </span>
          </button>

          {/* Diagnostics toggle */}
          <button
            type="button"
            onClick={onRunDiagnostics}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            title="Diagnostica di Sistema"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tag Filters Bar (without "Filtra:" label, with FilterX clear button) */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-2 overflow-x-auto text-xs bg-slate-50/50">
          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={onClearFilters}
            className={`inline-flex items-center justify-center rounded-lg p-1.5 text-xs font-medium transition cursor-pointer border ${
              activeTagIds.length > 0
                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs hover:bg-blue-700'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={activeTagIds.length > 0 ? 'Rimuovi filtri applicati' : 'Nessun filtro attivo (mostra tutti)'}
          >
            <FilterX className="h-3.5 w-3.5" />
          </button>

          {/* Tag Badges */}
          {tags.map((tag) => {
            const isActive = activeTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTagFilter(tag.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition border cursor-pointer ${
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
