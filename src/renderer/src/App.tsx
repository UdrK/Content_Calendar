import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  Tag as TagIcon,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { it } from 'date-fns/locale'

import { EventWithDetails, CreateEventInput, UpdateEventInput, DbHealthCheckResult } from '@shared/types'
import { CalendarGridEngine } from '../../core/calendar/CalendarGridEngine'
import { EventFilterEngine } from '../../core/filters/EventFilterEngine'

import { useTags } from './hooks/useTags'
import { useEvents } from './hooks/useEvents'

import { CalendarHeader } from './components/calendar/CalendarHeader'
import { MonthCalendarView } from './components/calendar/MonthCalendarView'
import { WeekCalendarView } from './components/calendar/WeekCalendarView'
import { EventModal } from './components/events/EventModal'
import { TagManagerModal } from './components/TagManagerModal'

export default function App(): React.ReactElement {
  // Calendar View State
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])

  // Modal States
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)
  const [eventToEdit, setEventToEdit] = useState<EventWithDetails | null>(null)

  // Diagnostics panel toggle
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [dbResult, setDbResult] = useState<DbHealthCheckResult | null>(null)

  // Domain Hooks
  const {
    tags,
    loading: tagsLoading,
    error: tagsError,
    createTag,
    updateTag,
    deleteTag,
    clearError: clearTagError
  } = useTags()

  const {
    events,
    fetchEventsByRange,
    createEvent,
    updateEvent,
    deleteEvent
  } = useEvents()

  // Load events for visible interval
  const reloadEvents = useCallback(async () => {
    let start: Date
    let end: Date

    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      start = startOfWeek(monthStart, { weekStartsOn: 1 })
      end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    } else {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    }

    const startIso = format(start, 'yyyy-MM-dd')
    const endIso = format(end, 'yyyy-MM-dd')
    await fetchEventsByRange(startIso, endIso)
  }, [currentDate, viewMode, fetchEventsByRange])

  useEffect(() => {
    reloadEvents()
  }, [reloadEvents])

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1))
    } else {
      setCurrentDate((prev) => subWeeks(prev, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1))
    } else {
      setCurrentDate((prev) => addWeeks(prev, 1))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Tag filter toggle
  const handleToggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleClearFilters = () => {
    setActiveTagIds([])
  }

  // Filter events using Headless EventFilterEngine
  const filteredEvents = useMemo(() => {
    return EventFilterEngine.filter(events, {
      activeTagIds
    })
  }, [events, activeTagIds])

  // Build Month and Week Grids using Headless CalendarGridEngine
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    return CalendarGridEngine.buildMonthMatrix(year, month, filteredEvents)
  }, [currentDate, filteredEvents])

  const weekGrid = useMemo(() => {
    return CalendarGridEngine.buildWeekMatrix(currentDate, filteredEvents)
  }, [currentDate, filteredEvents])

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      const formatted = format(currentDate, 'MMMM yyyy', { locale: it })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    } else {
      const weekNumber = format(currentDate, 'w')
      const formatted = format(currentDate, 'MMMM yyyy', { locale: it })
      return `Settimana ${weekNumber} • ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`
    }
  }, [currentDate, viewMode])

  // Event modal actions
  const handleOpenNewEvent = (targetDate?: Date) => {
    setSelectedDayDate(targetDate || currentDate)
    setEventToEdit(null)
    setIsEventModalOpen(true)
  }

  const handleOpenEditEvent = (evt: EventWithDetails) => {
    setEventToEdit(evt)
    setIsEventModalOpen(true)
  }

  const handleSaveEvent = async (data: CreateEventInput | UpdateEventInput) => {
    if (eventToEdit) {
      await updateEvent(eventToEdit.id, data)
    } else {
      await createEvent(data as CreateEventInput)
    }
    await reloadEvents()
  }

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id)
    await reloadEvents()
  }

  // Diagnostics check
  const handleRunDiagnostics = async () => {
    if (window.api) {
      const res = await window.api.dbHealthCheck()
      setDbResult(res)
    }
    setShowDiagnostics(true)
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 select-none overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="flex h-13 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">Content Calendar</h1>
            <p className="text-[10px] text-slate-400">Desktop Edition (Windows & macOS)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tag Manager Button */}
          <button
            onClick={() => setIsTagModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <TagIcon className="h-3.5 w-3.5 text-blue-600" />
            <span>Tag</span>
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
              {tags.length}
            </span>
          </button>

          {/* Diagnostics toggle */}
          <button
            onClick={handleRunDiagnostics}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-2xs hover:bg-slate-50 transition"
            title="Diagnostica di Sistema"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Diagnostics Banner if open */}
      {showDiagnostics && (
        <div className="border-b border-blue-100 bg-blue-50/70 px-6 py-2 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Stato Database:</span>
            <span>
              SQLite ({dbResult?.tablesCount ?? 4} tabelle attive) • Path: {dbResult?.path || 'Local AppData'}
            </span>
          </div>
          <button
            onClick={() => setShowDiagnostics(false)}
            className="text-blue-700 hover:text-blue-900 text-xs font-bold"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Calendar Navigation & Filters Header */}
      <CalendarHeader
        title={headerTitle}
        currentView={viewMode}
        onViewChange={setViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewEvent={() => handleOpenNewEvent()}
        tags={tags}
        activeTagIds={activeTagIds}
        onToggleTagFilter={handleToggleTagFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Calendar Grid View (Month or Week) */}
      <main className="flex flex-1 overflow-hidden">
        {viewMode === 'month' ? (
          <MonthCalendarView
            grid={monthGrid}
            onDayClick={(date) => handleOpenNewEvent(date)}
            onEventClick={(evt) => handleOpenEditEvent(evt)}
          />
        ) : (
          <WeekCalendarView
            grid={weekGrid}
            onDayClick={(date) => handleOpenNewEvent(date)}
            onEventClick={(evt) => handleOpenEditEvent(evt)}
          />
        )}
      </main>

      {/* Event Create / Edit Modal (Stories 06, 07, 08, 09) */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        initialDate={selectedDayDate}
        eventToEdit={eventToEdit}
        availableTags={tags}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Tag Manager Modal (Story 04) */}
      <TagManagerModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={tags}
        loading={tagsLoading}
        error={tagsError}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
        onClearError={clearTagError}
      />
    </div>
  )
}
