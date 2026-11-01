import { randomUUID } from 'crypto'
import { eq, inArray, gte, lte, and, or } from 'drizzle-orm'
import { getDb } from '../db'
import { events, tags, eventTags, eventAttachments } from '../db/schema'
import {
  CreateEventInput,
  UpdateEventInput,
  EventWithDetails,
  TagRecord,
  AttachmentRecord
} from '../../shared/types'
import { validateEventTitle, validateEventDates, EventValidationError } from '../../core/events/validators'

export async function getEventsByDateRange(
  startDate: string,
  endDate: string
): Promise<EventWithDetails[]> {
  const db = getDb()

  // Find all events that overlap [startDate, endDate]
  // Event starts <= endDate AND (event ends >= startDate OR event starts >= startDate)
  const eventRecords = await db
    .select()
    .from(events)
    .where(
      and(
        lte(events.startDate, endDate),
        or(
          gte(events.endDate, startDate),
          gte(events.startDate, startDate)
        )
      )
    )

  if (eventRecords.length === 0) return []

  const eventIds = eventRecords.map((e) => e.id)

  // Fetch associated tags
  const tagsRelations = await db
    .select({
      eventId: eventTags.eventId,
      tagId: tags.id,
      name: tags.name,
      colorHex: tags.colorHex
    })
    .from(eventTags)
    .innerJoin(tags, eq(eventTags.tagId, tags.id))
    .where(inArray(eventTags.eventId, eventIds))

  // Fetch associated attachments
  const attachmentsList = await db
    .select()
    .from(eventAttachments)
    .where(inArray(eventAttachments.eventId, eventIds))

  // Group by eventId
  const tagsByEvent = new Map<string, TagRecord[]>()
  for (const rel of tagsRelations) {
    if (!tagsByEvent.has(rel.eventId)) tagsByEvent.set(rel.eventId, [])
    tagsByEvent.get(rel.eventId)!.push({
      id: rel.tagId,
      name: rel.name,
      colorHex: rel.colorHex
    })
  }

  const attachmentsByEvent = new Map<string, AttachmentRecord[]>()
  for (const att of attachmentsList) {
    if (!attachmentsByEvent.has(att.eventId)) attachmentsByEvent.set(att.eventId, [])
    attachmentsByEvent.get(att.eventId)!.push({
      id: att.id,
      eventId: att.eventId,
      filePath: att.filePath,
      fileName: att.fileName,
      fileExtension: att.fileExtension,
      addedAt: att.addedAt
    })
  }

  return eventRecords.map((rec) => ({
    ...rec,
    tags: tagsByEvent.get(rec.id) ?? [],
    attachments: attachmentsByEvent.get(rec.id) ?? []
  }))
}

export async function getEventById(id: string): Promise<EventWithDetails | null> {
  const db = getDb()
  const records = await db.select().from(events).where(eq(events.id, id))
  if (records.length === 0) return null
  const rec = records[0]

  const eventTagsList = await db
    .select({
      id: tags.id,
      name: tags.name,
      colorHex: tags.colorHex
    })
    .from(eventTags)
    .innerJoin(tags, eq(eventTags.tagId, tags.id))
    .where(eq(eventTags.eventId, id))

  const attachmentsList = await db
    .select()
    .from(eventAttachments)
    .where(eq(eventAttachments.eventId, id))

  return {
    ...rec,
    tags: eventTagsList,
    attachments: attachmentsList.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      filePath: a.filePath,
      fileName: a.fileName,
      fileExtension: a.fileExtension,
      addedAt: a.addedAt
    }))
  }
}

export async function createEvent(input: CreateEventInput): Promise<EventWithDetails> {
  const db = getDb()
  const validatedTitle = validateEventTitle(input.title)
  validateEventDates(input.startDate, input.endDate)

  const id = randomUUID()
  const now = new Date().toISOString()

  const type = (input.attachments && input.attachments.length > 0) || input.type === 'attachment'
    ? 'attachment'
    : 'simple'

  await db.insert(events).values({
    id,
    type,
    title: validatedTitle,
    description: input.description ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    isAllDay: input.isAllDay ?? false,
    createdAt: now,
    updatedAt: now
  })

  // Insert tag relations
  const assignedTags: TagRecord[] = []
  if (input.tagIds && input.tagIds.length > 0) {
    for (const tagId of input.tagIds) {
      await db.insert(eventTags).values({
        eventId: id,
        tagId
      })
    }
    const fetchedTags = await db
      .select()
      .from(tags)
      .where(inArray(tags.id, input.tagIds))
    assignedTags.push(...fetchedTags)
  }

  // Insert attachments
  const createdAttachments: AttachmentRecord[] = []
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      const attId = randomUUID()
      await db.insert(eventAttachments).values({
        id: attId,
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      })
      createdAttachments.push({
        id: attId,
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      })
    }
  }

  return {
    id,
    type,
    title: validatedTitle,
    description: input.description ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    isAllDay: input.isAllDay ?? false,
    createdAt: now,
    updatedAt: now,
    tags: assignedTags,
    attachments: createdAttachments
  }
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<EventWithDetails> {
  const db = getDb()
  const current = await getEventById(id)
  if (!current) {
    throw new EventValidationError(`Evento con ID "${id}" non trovato.`)
  }

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString()
  }

  if (input.title !== undefined) {
    updates.title = validateEventTitle(input.title)
  }
  if (input.description !== undefined) {
    updates.description = input.description
  }

  const newStart = input.startDate ?? current.startDate
  const newEnd = input.endDate !== undefined ? input.endDate : current.endDate
  validateEventDates(newStart, newEnd)

  if (input.startDate !== undefined) updates.startDate = input.startDate
  if (input.endDate !== undefined) updates.endDate = input.endDate
  if (input.isAllDay !== undefined) updates.isAllDay = input.isAllDay

  // If attachments are modified, update type accordingly
  if (input.attachments !== undefined) {
    updates.type = input.attachments.length > 0 ? 'attachment' : 'simple'
  }

  await db.update(events).set(updates).where(eq(events.id, id))

  // Sync tags if provided
  if (input.tagIds !== undefined) {
    await db.delete(eventTags).where(eq(eventTags.eventId, id))
    if (input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        await db.insert(eventTags).values({
          eventId: id,
          tagId
        })
      }
    }
  }

  // Sync attachments if provided
  if (input.attachments !== undefined) {
    await db.delete(eventAttachments).where(eq(eventAttachments.eventId, id))
    const now = new Date().toISOString()
    for (const att of input.attachments) {
      await db.insert(eventAttachments).values({
        id: randomUUID(),
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      })
    }
  }

  const updated = await getEventById(id)
  return updated!
}

export async function deleteEvent(id: string): Promise<boolean> {
  const db = getDb()
  const current = await getEventById(id)
  if (!current) return false

  await db.delete(events).where(eq(events.id, id))
  return true
}
