import { ipcMain } from 'electron'
import {
  getEventsByDateRange,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} from '../services/event.service'
import {
  CreateEventInput,
  UpdateEventInput,
  EventWithDetails
} from '../../shared/types'

export function registerEventIpcHandlers(): void {
  ipcMain.handle(
    'events:get-by-range',
    async (
      _,
      { startDate, endDate }: { startDate: string; endDate: string }
    ): Promise<EventWithDetails[]> => {
      return await getEventsByDateRange(startDate, endDate)
    }
  )

  ipcMain.handle(
    'events:get-by-id',
    async (_, id: string): Promise<EventWithDetails | null> => {
      return await getEventById(id)
    }
  )

  ipcMain.handle(
    'events:create',
    async (_, input: CreateEventInput): Promise<EventWithDetails> => {
      return await createEvent(input)
    }
  )

  ipcMain.handle(
    'events:update',
    async (
      _,
      { id, input }: { id: string; input: UpdateEventInput }
    ): Promise<EventWithDetails> => {
      return await updateEvent(id, input)
    }
  )

  ipcMain.handle('events:delete', async (_, id: string): Promise<boolean> => {
    return await deleteEvent(id)
  })
}
