export type EventType = 'simple' | 'attachment'

export interface TagRecord {
  id: string
  name: string
  colorHex: string
}

export interface CreateTagInput {
  name: string
  colorHex: string
}

export interface UpdateTagInput {
  name?: string
  colorHex?: string
}

export interface AttachmentRecord {
  id: string
  eventId: string
  filePath: string
  fileName: string
  fileExtension: string
  addedAt: string
}

export interface FileAttachmentInput {
  filePath: string
  fileName: string
  fileExtension: string
}

export interface EventRecord {
  id: string
  type: EventType
  title: string
  description?: string | null
  date: string
  isDone: boolean
  metadata?: string | null
  createdAt: string
  updatedAt: string
}

export interface EventWithDetails extends EventRecord {
  tags: TagRecord[]
  attachments: AttachmentRecord[]
}

export interface CreateEventInput {
  type: EventType
  title: string
  description?: string | null
  date: string
  isDone?: boolean
  tagIds?: string[]
  attachments?: FileAttachmentInput[]
}

export interface UpdateEventInput {
  title?: string
  description?: string | null
  date?: string
  isDone?: boolean
  tagIds?: string[]
  attachments?: FileAttachmentInput[]
}

export interface PickedFile {
  filePath: string
  fileName: string
  fileExtension: string
}

export interface RevealFileResult {
  success: boolean
  error?: string
}

export interface DbHealthCheckResult {
  status: 'ok' | 'error'
  path: string
  tablesCount: number
  error?: string
}

export interface TagAPI {
  getAll: () => Promise<TagRecord[]>
  getById: (id: string) => Promise<TagRecord | null>
  create: (input: CreateTagInput) => Promise<TagRecord>
  update: (id: string, input: UpdateTagInput) => Promise<TagRecord>
  delete: (id: string) => Promise<boolean>
}

export interface EventAPI {
  getByRange: (startDate: string, endDate: string) => Promise<EventWithDetails[]>
  getById: (id: string) => Promise<EventWithDetails | null>
  create: (input: CreateEventInput) => Promise<EventWithDetails>
  update: (id: string, input: UpdateEventInput) => Promise<EventWithDetails>
  delete: (id: string) => Promise<boolean>
}

export interface FileSystemAPI {
  pickFiles: () => Promise<PickedFile[]>
  revealInFolder: (filePath: string) => Promise<RevealFileResult>
}

export interface ElectronAPI {
  ping: () => Promise<string>
  dbHealthCheck: () => Promise<DbHealthCheckResult>
  tags: TagAPI
  events: EventAPI
  fileSystem: FileSystemAPI
}
