import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { it } from 'date-fns/locale'

import {
  EventWithDetails,
  CreateEventInput,
  UpdateEventInput,
  CreateTagInput,
  UpdateTagInput,
  DbHealthCheckResult
} from '@shared/types'
import { CalendarGridEngine } from '../../core/calendar/CalendarGridEngine'
import { EventFilterEngine } from '../../core/filters/EventFilterEngine'

import { useTags } from './hooks/useTags'
import { useEvents } from './hooks/useEvents'

import { CalendarHeader } from './components/calendar/CalendarHeader'
import { WeekCalendarView } from './components/calendar/WeekCalendarView'
import { EventModal } from './components/events/EventModal'
import { EventDetailsPanel } from './components/events/EventDetailsPanel'
import { TagManagerModal } from './components/TagManagerModal'
import { RetentionModal } from './components/settings/RetentionModal'

export default function App(): React.ReactElement {
  // Calendar View State: Weekly view
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])

  // Modal States
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)
  const [eventToEdit, setEventToEdit] = useState<EventWithDetails | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

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

  // Load events for the visible week interval
  const reloadEvents = useCallback(async () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    const startIso = format(start, 'yyyy-MM-dd')
    const endIso = format(end, 'yyyy-MM-dd')
    await fetchEventsByRange(startIso, endIso)
  }, [currentDate, fetchEventsByRange])

  useEffect(() => {
    reloadEvents()
  }, [reloadEvents])

  // Navigation handlers (Weekly steps)
  const handlePrev = () => {
    setCurrentDate((prev) => subWeeks(prev, 1))
  }

  const handleNext = () => {
    setCurrentDate((prev) => addWeeks(prev, 1))
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

  // Live Tag Synchronization (Story 04 & Req 4):
  // Resolve event tags against current reactive tags list by tag.id so any color or name edit
  // reflects immediately across all event badges in the calendar.
  const tagsMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const eventsWithLiveTags = useMemo(() => {
    return events.map((evt) => ({
      ...evt,
      tags: evt.tags
        .map((t) => tagsMap.get(t.id) ?? t)
        .filter((t) => tagsMap.has(t.id))
    }))
  }, [events, tagsMap])

  // Current active event for persistent bottom inspection panel
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null
    return eventsWithLiveTags.find((e) => e.id === selectedEventId) ?? null
  }, [selectedEventId, eventsWithLiveTags])

  // Filter events using Headless EventFilterEngine
  const filteredEvents = useMemo(() => {
    return EventFilterEngine.filter(eventsWithLiveTags, {
      activeTagIds
    })
  }, [eventsWithLiveTags, activeTagIds])

  // Build Week Grid using Headless CalendarGridEngine
  const weekGrid = useMemo(() => {
    return CalendarGridEngine.buildWeekMatrix(currentDate, filteredEvents)
  }, [currentDate, filteredEvents])

  // Header Title: First Day - Last Day Month Year (no week number)
  const headerTitle = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })

    const startDay = format(start, 'd')
    const endDay = format(end, 'd')
    const startMonth = format(start, 'MMMM', { locale: it })
    const endMonth = format(end, 'MMMM', { locale: it })
    const startYear = format(start, 'yyyy')
    const endYear = format(end, 'yyyy')

    const capStartMonth = startMonth.charAt(0).toUpperCase() + startMonth.slice(1)
    const capEndMonth = endMonth.charAt(0).toUpperCase() + endMonth.slice(1)

    if (startYear !== endYear) {
      return `${startDay} ${capStartMonth} ${startYear} - ${endDay} ${capEndMonth} ${endYear}`
    }
    if (startMonth !== endMonth) {
      return `${startDay} ${capStartMonth} - ${endDay} ${capEndMonth} ${endYear}`
    }
    return `${startDay} - ${endDay} ${capEndMonth} ${endYear}`
  }, [currentDate])

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
    if (selectedEventId === id) {
      setSelectedEventId(null)
    }
    await deleteEvent(id)
    await reloadEvents()
  }

  // Immediate toggle of event status from bottom panel
  const handleToggleDone = async (evt: EventWithDetails) => {
    await updateEvent(evt.id, { isDone: !evt.isDone })
    await reloadEvents()
  }

  // Tag Manager actions with automatic event reload
  const handleCreateTag = async (input: CreateTagInput) => {
    const res = await createTag(input)
    await reloadEvents()
    return res
  }

  const handleUpdateTag = async (id: string, input: UpdateTagInput) => {
    const res = await updateTag(id, input)
    await reloadEvents()
    return res
  }

  const handleDeleteTag = async (id: string) => {
    const res = await deleteTag(id)
    await reloadEvents()
    return res
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
      {/* Calendar Header with Week Title, Navigation, Actions & Filters */}
      <CalendarHeader
        title={headerTitle}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onOpenTagManager={() => setIsTagModalOpen(true)}
        tagsCount={tags.length}
        onRunDiagnostics={handleRunDiagnostics}
        onOpenRetention={() => setIsRetentionModalOpen(true)}
        tags={tags}
        activeTagIds={activeTagIds}
        onToggleTagFilter={handleToggleTagFilter}
        onClearFilters={handleClearFilters}
      />

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
            className="text-blue-700 hover:text-blue-900 text-xs font-bold cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Workspace Master-Detail Split Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top: Calendar Grid View (Week Only) */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <WeekCalendarView
            grid={weekGrid}
            selectedEventId={selectedEventId}
            onDayClick={(date) => handleOpenNewEvent(date)}
            onEventClick={(evt) => setSelectedEventId(evt.id)}
          />
        </main>

        {/* Bottom: Persistent Details Panel */}
        <EventDetailsPanel
          event={selectedEvent}
          onToggleDone={handleToggleDone}
          onEdit={(evt) => handleOpenEditEvent(evt)}
          onDeselect={() => setSelectedEventId(null)}
        />
      </div>

      {/* Event Create / Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        initialDate={selectedDayDate}
        eventToEdit={eventToEdit}
        availableTags={tags}
        onCreateTag={handleCreateTag}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={tags}
        loading={tagsLoading}
        error={tagsError}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
        onClearError={clearTagError}
      />

      {/* Attachments & Retention Settings Modal */}
      <RetentionModal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
      />
    </div>
  )
}
