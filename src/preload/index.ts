import { contextBridge, ipcRenderer } from 'electron'
import {
  ElectronAPI,
  DbHealthCheckResult,
  TagRecord,
  CreateTagInput,
  UpdateTagInput,
  EventWithDetails,
  CreateEventInput,
  UpdateEventInput,
  PickedFile,
  RevealFileResult,
  RetentionPolicy,
  RetentionStats,
  AttachmentStorageStats
} from '../shared/types'

const api: ElectronAPI = {
  ping: (): Promise<string> => ipcRenderer.invoke('app:ping'),
  dbHealthCheck: (): Promise<DbHealthCheckResult> => ipcRenderer.invoke('db:health-check'),
  tags: {
    getAll: (): Promise<TagRecord[]> => ipcRenderer.invoke('tags:get-all'),
    getById: (id: string): Promise<TagRecord | null> => ipcRenderer.invoke('tags:get-by-id', id),
    create: (input: CreateTagInput): Promise<TagRecord> => ipcRenderer.invoke('tags:create', input),
    update: (id: string, input: UpdateTagInput): Promise<TagRecord> =>
      ipcRenderer.invoke('tags:update', { id, input }),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('tags:delete', id)
  },
  events: {
    getByRange: (startDate: string, endDate: string): Promise<EventWithDetails[]> =>
      ipcRenderer.invoke('events:get-by-range', { startDate, endDate }),
    getById: (id: string): Promise<EventWithDetails | null> =>
      ipcRenderer.invoke('events:get-by-id', id),
    create: (input: CreateEventInput): Promise<EventWithDetails> =>
      ipcRenderer.invoke('events:create', input),
    update: (id: string, input: UpdateEventInput): Promise<EventWithDetails> =>
      ipcRenderer.invoke('events:update', { id, input }),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('events:delete', id)
  },
  fileSystem: {
    pickFiles: (): Promise<PickedFile[]> => ipcRenderer.invoke('file:pick-files'),
    revealInFolder: (filePath: string): Promise<RevealFileResult> =>
      ipcRenderer.invoke('file:reveal-in-folder', filePath)
  },
  retention: {
    getPolicy: (): Promise<RetentionPolicy> => ipcRenderer.invoke('retention:get-policy'),
    setPolicy: (policy: RetentionPolicy): Promise<RetentionPolicy> =>
      ipcRenderer.invoke('retention:set-policy', policy),
    applyRetention: (): Promise<RetentionStats> => ipcRenderer.invoke('retention:apply'),
    getStats: (): Promise<AttachmentStorageStats> => ipcRenderer.invoke('attachments:get-stats')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose api to main world:', error)
  }
} else {
  // @ts-ignore (define in window)
  window.api = api
}
