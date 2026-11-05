import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { initDatabase, closeDatabase } from '../src/main/db'
import { events, eventAttachments } from '../src/main/db/schema'
import {
  setCustomAttachmentsBaseDir,
  getAttachmentsBaseDir,
  getEventAttachmentDir,
  copyAttachmentForEvent,
  deleteSpecificAttachmentFile,
  deleteEventAttachmentsDir,
  getAttachmentStorageStats,
  setRetentionPolicy,
  getRetentionPolicy,
  applyRetentionPolicy
} from '../src/main/services/attachment.service'
import { createEvent, getEventById, updateEvent, deleteEvent } from '../src/main/services/event.service'

describe('Managed Attachments & Retention Service', () => {
  let testStorageDir: string
  let testSourceDir: string

  beforeEach(async () => {
    // Isolated storage directory
    testStorageDir = mkdtempSync(join(tmpdir(), 'cal-storage-'))
    testSourceDir = mkdtempSync(join(tmpdir(), 'cal-source-'))
    setCustomAttachmentsBaseDir(testStorageDir)

    // In-memory database
    const { db } = await initDatabase(':memory:')
    await db.delete(events)
  })

  afterEach(() => {
    closeDatabase()
    setCustomAttachmentsBaseDir(null)
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true })
    }
    if (existsSync(testSourceDir)) {
      rmSync(testSourceDir, { recursive: true, force: true })
    }
  })

  it('should organize folders by date YYYY-MM and evento_<id>', () => {
    const dir = getEventAttachmentDir('evt123', '2026-11-15')
    expect(dir).toContain('2026-11')
    expect(dir).toContain('evento_evt123')
    expect(existsSync(dir)).toBe(true)
  })

  it('should copy source file into the event managed folder with correct extension', () => {
    const srcFile = join(testSourceDir, 'banner.png')
    writeFileSync(srcFile, 'dummy image content')

    const result = copyAttachmentForEvent('evt100', '2026-11-20', srcFile, 'banner.png')

    expect(result.fileName).toBe('banner.png')
    expect(result.fileExtension).toBe('.png')
    expect(result.filePath).toContain('2026-11/evento_evt100/banner.png')
    expect(existsSync(result.filePath)).toBe(true)
    expect(result.originalFilePath).toBe(srcFile.replace(/\\/g, '/'))
  })

  it('should resolve name collisions by appending numbers like (1)', () => {
    const srcFile1 = join(testSourceDir, 'doc.pdf')
    writeFileSync(srcFile1, 'version 1')

    const res1 = copyAttachmentForEvent('evt200', '2026-11-01', srcFile1, 'doc.pdf')
    expect(res1.fileName).toBe('doc.pdf')

    // Second file with the same name
    const srcFile2 = join(testSourceDir, 'doc_alt.pdf')
    writeFileSync(srcFile2, 'version 2')

    const res2 = copyAttachmentForEvent('evt200', '2026-11-01', srcFile2, 'doc.pdf')
    expect(res2.fileName).toBe('doc (1).pdf')
    expect(existsSync(res2.filePath)).toBe(true)
  })

  it('should not re-copy if file is already inside the event folder', () => {
    const srcFile = join(testSourceDir, 'brief.docx')
    writeFileSync(srcFile, 'brief content')

    const first = copyAttachmentForEvent('evt300', '2026-12-05', srcFile, 'brief.docx')
    const second = copyAttachmentForEvent('evt300', '2026-12-05', first.filePath, 'brief.docx')

    expect(second.filePath).toBe(first.filePath)
    expect(second.fileName).toBe('brief.docx')
  })

  it('should safely delete only files inside the managed directory', () => {
    const srcFile = join(testSourceDir, 'external.txt')
    writeFileSync(srcFile, 'do not delete me')

    const copied = copyAttachmentForEvent('evt400', '2026-11-01', srcFile, 'external.txt')
    expect(existsSync(copied.filePath)).toBe(true)

    // Delete managed file
    const deletedManaged = deleteSpecificAttachmentFile(copied.filePath)
    expect(deletedManaged).toBe(true)
    expect(existsSync(copied.filePath)).toBe(false)

    // Attempting to delete external file must be rejected by safety check
    const deletedExternal = deleteSpecificAttachmentFile(srcFile)
    expect(deletedExternal).toBe(false)
    expect(existsSync(srcFile)).toBe(true)
  })

  it('should delete event directory on deleteEventAttachmentsDir', () => {
    const srcFile = join(testSourceDir, 'slide.pdf')
    writeFileSync(srcFile, 'presentation')

    const copied = copyAttachmentForEvent('evt500', '2026-11-10', srcFile, 'slide.pdf')
    expect(existsSync(copied.filePath)).toBe(true)

    deleteEventAttachmentsDir('evt500', '2026-11-10')

    const eventDir = getEventAttachmentDir('evt500', '2026-11-10')
    expect(existsSync(copied.filePath)).toBe(false)
  })

  it('should integrate end-to-end with createEvent, updateEvent, and deleteEvent', async () => {
    const srcFile = join(testSourceDir, 'creative.jpg')
    writeFileSync(srcFile, 'image bytes')

    // 1. Create event with attachment
    const event = await createEvent({
      type: 'attachment',
      title: 'Campagna Social',
      date: '2026-11-15',
      isDone: false,
      attachments: [
        {
          filePath: srcFile,
          fileName: 'creative.jpg',
          fileExtension: '.jpg'
        }
      ]
    })

    expect(event.attachments).toHaveLength(1)
    const managedPath = event.attachments[0].filePath
    expect(managedPath).toContain('2026-11/evento_' + event.id)
    expect(existsSync(managedPath)).toBe(true)

    // 2. Update event by removing the attachment
    const updated = await updateEvent(event.id, {
      attachments: []
    })
    expect(updated.attachments).toHaveLength(0)
    expect(existsSync(managedPath)).toBe(false)

    // 3. Delete event
    const success = await deleteEvent(event.id)
    expect(success).toBe(true)
  })

  it('should apply retention policy: purge files of completed events older than threshold', async () => {
    const srcFile = join(testSourceDir, 'report.pdf')
    writeFileSync(srcFile, 'q3 report')

    // Event 1: Old and Done (should be purged)
    const oldDoneEvent = await createEvent({
      type: 'attachment',
      title: 'Old Done Task',
      date: '2026-09-01', // 60+ days ago relative to November
      isDone: true,
      attachments: [
        {
          filePath: srcFile,
          fileName: 'report_old.pdf',
          fileExtension: '.pdf'
        }
      ]
    })
    const oldManagedPath = oldDoneEvent.attachments[0].filePath
    expect(existsSync(oldManagedPath)).toBe(true)

    // Event 2: Old but NOT Done (should NOT be purged under onlyDone=true)
    const oldPendingEvent = await createEvent({
      type: 'attachment',
      title: 'Old Pending Task',
      date: '2026-09-01',
      isDone: false,
      attachments: [
        {
          filePath: srcFile,
          fileName: 'report_pending.pdf',
          fileExtension: '.pdf'
        }
      ]
    })
    const pendingManagedPath = oldPendingEvent.attachments[0].filePath
    expect(existsSync(pendingManagedPath)).toBe(true)

    // Event 3: Recent and Done (should NOT be purged)
    const recentDoneEvent = await createEvent({
      type: 'attachment',
      title: 'Recent Done Task',
      date: '2026-11-04',
      isDone: true,
      attachments: [
        {
          filePath: srcFile,
          fileName: 'report_recent.pdf',
          fileExtension: '.pdf'
        }
      ]
    })
    const recentManagedPath = recentDoneEvent.attachments[0].filePath
    expect(existsSync(recentManagedPath)).toBe(true)

    // Apply 30 days retention policy for done events
    await setRetentionPolicy({ retentionDays: 30, onlyDone: true })
    const policy = await getRetentionPolicy()
    expect(policy.retentionDays).toBe(30)
    expect(policy.onlyDone).toBe(true)

    const stats = await applyRetentionPolicy()
    expect(stats.purgedFilesCount).toBe(1)
    expect(stats.purgedEventsCount).toBe(1)

    // Verify disk state
    expect(existsSync(oldManagedPath)).toBe(false)
    expect(existsSync(pendingManagedPath)).toBe(true)
    expect(existsSync(recentManagedPath)).toBe(true)

    // Verify DB state
    const refreshedOld = await getEventById(oldDoneEvent.id)
    expect(refreshedOld?.attachments).toHaveLength(0)
    expect(refreshedOld?.type).toBe('simple')

    const refreshedPending = await getEventById(oldPendingEvent.id)
    expect(refreshedPending?.attachments).toHaveLength(1)
  })

  it('should compute storage statistics correctly', async () => {
    const src1 = join(testSourceDir, 'file1.txt')
    const src2 = join(testSourceDir, 'file2.txt')
    writeFileSync(src1, '12345') // 5 bytes
    writeFileSync(src2, '1234567890') // 10 bytes

    copyAttachmentForEvent('evt1', '2026-11-01', src1, 'file1.txt')
    copyAttachmentForEvent('evt2', '2026-11-02', src2, 'file2.txt')

    const stats = await getAttachmentStorageStats()
    expect(stats.totalFiles).toBe(2)
    expect(stats.totalBytes).toBe(15)
    expect(stats.storagePath).toBe(testStorageDir.replace(/\\/g, '/'))
  })
})
