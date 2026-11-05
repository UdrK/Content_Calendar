import { join, extname, basename } from 'path'
import { tmpdir } from 'os'
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
  rmSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'fs'
import { eq, inArray, and, lte } from 'drizzle-orm'
import { getDb } from '../db'
import { events, eventAttachments, appSettings } from '../db/schema'
import { RetentionPolicy, RetentionStats, AttachmentStorageStats } from '../../shared/types'
import { normalizeCrossPlatformPath } from '../../core/filesystem/pathUtils'

function getElectronApp(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('electron').app
  } catch {
    return null
  }
}

let customBaseDir: string | null = null

export function setCustomAttachmentsBaseDir(path: string | null): void {
  customBaseDir = path ? normalizeCrossPlatformPath(path) : null
}

export function getAttachmentsBaseDir(): string {
  if (customBaseDir) {
    try {
      mkdirSync(customBaseDir, { recursive: true })
    } catch {
      // ignore
    }
    return customBaseDir
  }

  try {
    const electronApp = getElectronApp()
    if (electronApp && typeof electronApp.getPath === 'function') {
      const userDataPath = electronApp.getPath('userData')
      const dir = join(userDataPath, 'attachments')
      mkdirSync(dir, { recursive: true })
      return normalizeCrossPlatformPath(dir)
    }
  } catch {
    // fallback
  }

  const dir = join(tmpdir(), 'content_calendar', 'attachments')
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    // ignore
  }
  return normalizeCrossPlatformPath(dir)
}

/**
 * Returns the organized destination folder:
 * attachments/YYYY-MM/evento_<eventId>/
 */
export function getEventAttachmentDir(eventId: string, eventDate: string): string {
  const baseDir = getAttachmentsBaseDir()
  const yearMonth = eventDate && eventDate.length >= 7 ? eventDate.slice(0, 7) : 'general'
  const eventFolder = `evento_${eventId}`
  const fullPath = join(baseDir, yearMonth, eventFolder)
  mkdirSync(fullPath, { recursive: true })
  return normalizeCrossPlatformPath(fullPath)
}

/**
 * Copies a source attachment file into the event's managed folder.
 * Avoids redundant copying if the file is already inside the event folder.
 * Automatically resolves name collisions by appending (1), (2), etc.
 */
export function copyAttachmentForEvent(
  eventId: string,
  eventDate: string,
  sourcePath: string,
  preferredFileName?: string
): { filePath: string; fileName: string; fileExtension: string; originalFilePath: string } {
  const normalizedSource = normalizeCrossPlatformPath(sourcePath)
  const targetDir = getEventAttachmentDir(eventId, eventDate)

  const originalName = preferredFileName || basename(normalizedSource)
  const ext = extname(originalName)
  const baseNameWithoutExt = basename(originalName, ext)

  const normalizedTargetDir = normalizeCrossPlatformPath(targetDir)
  // If the file is already inside the event's managed folder, keep it
  if (normalizedSource.startsWith(normalizedTargetDir) && existsSync(normalizedSource)) {
    return {
      filePath: normalizedSource,
      fileName: originalName,
      fileExtension: ext.toLowerCase(),
      originalFilePath: normalizedSource
    }
  }

  // Find a unique filename in target folder
  let targetFileName = originalName
  let counter = 1
  let targetFilePath = join(targetDir, targetFileName)

  while (existsSync(targetFilePath)) {
    targetFileName = `${baseNameWithoutExt} (${counter})${ext}`
    targetFilePath = join(targetDir, targetFileName)
    counter++
  }

  // Perform copy or create placeholder if source is virtual/mock
  if (existsSync(normalizedSource)) {
    copyFileSync(normalizedSource, targetFilePath)
  } else {
    try {
      writeFileSync(targetFilePath, '')
    } catch {
      // ignore
    }
  }

  const normalizedDest = normalizeCrossPlatformPath(targetFilePath)
  return {
    filePath: normalizedDest,
    fileName: targetFileName,
    fileExtension: ext.toLowerCase(),
    originalFilePath: normalizedSource
  }
}

/**
 * Deletes the event's attachment folder and removes empty parent month directories.
 */
export function deleteEventAttachmentsDir(eventId: string, eventDate?: string): void {
  try {
    const baseDir = getAttachmentsBaseDir()

    if (eventDate && eventDate.length >= 7) {
      const yearMonth = eventDate.slice(0, 7)
      const folder = join(baseDir, yearMonth, `evento_${eventId}`)
      if (existsSync(folder)) {
        rmSync(folder, { recursive: true, force: true })
      }
      const parent = join(baseDir, yearMonth)
      if (existsSync(parent) && readdirSync(parent).length === 0) {
        rmSync(parent, { recursive: true, force: true })
      }
      return
    }

    // If eventDate is unknown, search in all YYYY-MM subfolders
    if (existsSync(baseDir)) {
      const subdirs = readdirSync(baseDir)
      for (const sub of subdirs) {
        const candidate = join(baseDir, sub, `evento_${eventId}`)
        if (existsSync(candidate)) {
          rmSync(candidate, { recursive: true, force: true })
          const parent = join(baseDir, sub)
          if (existsSync(parent) && readdirSync(parent).length === 0) {
            rmSync(parent, { recursive: true, force: true })
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to delete attachments dir for event ${eventId}`, err)
  }
}

/**
 * Safely deletes a specific attachment file only if it resides within the managed attachments base dir.
 */
export function deleteSpecificAttachmentFile(filePath: string): boolean {
  try {
    const normalized = normalizeCrossPlatformPath(filePath)
    const base = normalizeCrossPlatformPath(getAttachmentsBaseDir())

    // Safety guard: only delete if inside our managed storage
    if (normalized.startsWith(base) && existsSync(normalized)) {
      unlinkSync(normalized)
      return true
    }
  } catch (err) {
    console.warn(`Failed to delete attachment file: ${filePath}`, err)
  }
  return false
}

/**
 * Computes storage statistics (total files and byte size) of the managed attachments directory.
 */
export async function getAttachmentStorageStats(): Promise<AttachmentStorageStats> {
  const baseDir = getAttachmentsBaseDir()
  let totalFiles = 0
  let totalBytes = 0

  function scanDir(dir: string): void {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.isFile()) {
        totalFiles++
        try {
          totalBytes += statSync(fullPath).size
        } catch {
          // ignore
        }
      }
    }
  }

  scanDir(baseDir)

  return {
    totalFiles,
    totalBytes,
    storagePath: baseDir
  }
}

// Default retention policy
const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  retentionDays: null, // null = never delete
  onlyDone: true
}

export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  const db = getDb()
  const rows = await db.select().from(appSettings).where(
    inArray(appSettings.key, ['retention_days', 'retention_only_done'])
  )

  const settingsMap = new Map(rows.map((r) => [r.key, r.value]))
  const rawDays = settingsMap.get('retention_days')
  const rawOnlyDone = settingsMap.get('retention_only_done')

  const retentionDays =
    rawDays && rawDays !== 'never' && !isNaN(Number(rawDays)) ? Number(rawDays) : null
  const onlyDone = rawOnlyDone !== 'false'

  return {
    retentionDays,
    onlyDone
  }
}

export async function setRetentionPolicy(policy: RetentionPolicy): Promise<RetentionPolicy> {
  const db = getDb()
  const daysValue = policy.retentionDays && policy.retentionDays > 0 ? String(policy.retentionDays) : 'never'
  const onlyDoneValue = policy.onlyDone ? 'true' : 'false'

  await db
    .insert(appSettings)
    .values({ key: 'retention_days', value: daysValue })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: daysValue }
    })

  await db
    .insert(appSettings)
    .values({ key: 'retention_only_done', value: onlyDoneValue })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: onlyDoneValue }
    })

  return {
    retentionDays: policy.retentionDays && policy.retentionDays > 0 ? policy.retentionDays : null,
    onlyDone: policy.onlyDone
  }
}

/**
 * Applies the retention policy:
 * Identifies events older than the threshold days (and marked as isDone if onlyDone is true),
 * deletes their managed files from disk, and removes the attachment records from SQLite.
 */
export async function applyRetentionPolicy(
  overridePolicy?: RetentionPolicy
): Promise<RetentionStats> {
  const policy = overridePolicy || (await getRetentionPolicy())

  if (!policy.retentionDays || policy.retentionDays <= 0) {
    return { purgedFilesCount: 0, purgedEventsCount: 0, freedBytes: 0 }
  }

  const db = getDb()

  // Calculate cutoff date (YYYY-MM-DD)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - policy.retentionDays)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  // Query candidate events
  const candidateEvents = await db
    .select({ id: events.id, date: events.date, isDone: events.isDone })
    .from(events)
    .where(
      and(
        lte(events.date, cutoffIso),
        policy.onlyDone ? eq(events.isDone, true) : undefined
      )
    )

  if (candidateEvents.length === 0) {
    return { purgedFilesCount: 0, purgedEventsCount: 0, freedBytes: 0 }
  }

  const candidateIds = candidateEvents.map((e) => e.id)

  // Find all attachments for candidate events
  const attachmentsToPurge = await db
    .select()
    .from(eventAttachments)
    .where(inArray(eventAttachments.eventId, candidateIds))

  if (attachmentsToPurge.length === 0) {
    return { purgedFilesCount: 0, purgedEventsCount: 0, freedBytes: 0 }
  }

  let purgedFilesCount = 0
  let freedBytes = 0

  for (const att of attachmentsToPurge) {
    try {
      if (existsSync(att.filePath)) {
        freedBytes += statSync(att.filePath).size
      }
      deleteSpecificAttachmentFile(att.filePath)
      purgedFilesCount++
    } catch {
      // ignore
    }
  }

  // Delete event attachment directories
  const eventsWithAttachments = new Set(attachmentsToPurge.map((a) => a.eventId))
  for (const evt of candidateEvents) {
    if (eventsWithAttachments.has(evt.id)) {
      deleteEventAttachmentsDir(evt.id, evt.date)
    }
  }

  // Delete attachment records from database
  await db
    .delete(eventAttachments)
    .where(inArray(eventAttachments.eventId, candidateIds))

  // Update events type to 'simple' if they now have no attachments
  await db
    .update(events)
    .set({ type: 'simple' })
    .where(inArray(events.id, Array.from(eventsWithAttachments)))

  return {
    purgedFilesCount,
    purgedEventsCount: eventsWithAttachments.size,
    freedBytes
  }
}
