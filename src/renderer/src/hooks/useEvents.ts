import { useState, useCallback } from 'react'
import { EventWithDetails, CreateEventInput, UpdateEventInput } from '@shared/types'

export interface UseEventsReturn {
  events: EventWithDetails[]
  loading: boolean
  error: string | null
  fetchEventsByRange: (startDate: string, endDate: string) => Promise<EventWithDetails[]>
  createEvent: (input: CreateEventInput) => Promise<EventWithDetails>
  updateEvent: (id: string, input: UpdateEventInput) => Promise<EventWithDetails>
  deleteEvent: (id: string) => Promise<boolean>
  clearError: () => void
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const fetchEventsByRange = useCallback(
    async (startDate: string, endDate: string): Promise<EventWithDetails[]> => {
      setLoading(true)
      setError(null)
      try {
        if (!window.api?.events) {
          return []
        }
        const data = await window.api.events.getByRange(startDate, endDate)
        setEvents(data)
        return data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<EventWithDetails> => {
      setError(null)
      try {
        if (!window.api?.events) {
          throw new Error('API non disponibile')
        }
        const created = await window.api.events.create(input)
        setEvents((prev) => [...prev, created])
        return created
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw err
      }
    },
    []
  )

  const updateEvent = useCallback(
    async (id: string, input: UpdateEventInput): Promise<EventWithDetails> => {
      setError(null)
      try {
        if (!window.api?.events) {
          throw new Error('API non disponibile')
        }
        const updated = await window.api.events.update(id, input)
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
        return updated
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw err
      }
    },
    []
  )

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      if (!window.api?.events) {
        throw new Error('API non disponibile')
      }
      const success = await window.api.events.delete(id)
      if (success) {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }
      return success
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    }
  }, [])

  return {
    events,
    loading,
    error,
    fetchEventsByRange,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError
  }
}
