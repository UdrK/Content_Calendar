import { randomUUID } from 'crypto'
import { eq, asc, sql } from 'drizzle-orm'
import { getDb } from '../db'
import { tags } from '../db/schema'
import { TagRecord, CreateTagInput, UpdateTagInput } from '../../shared/types'

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export class TagValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TagValidationError'
  }
}

export function validateTagName(name: string): string {
  const trimmed = name?.trim()
  if (!trimmed) {
    throw new TagValidationError('Il nome del tag non può essere vuoto.')
  }
  if (trimmed.length > 50) {
    throw new TagValidationError('Il nome del tag non può superare i 50 caratteri.')
  }
  return trimmed
}

export function validateTagColor(colorHex: string): string {
  const trimmed = colorHex?.trim().toUpperCase()
  if (!trimmed || !HEX_COLOR_REGEX.test(trimmed)) {
    throw new TagValidationError('Il colore del tag deve essere un codice HEX valido (es. #3B82F6).')
  }
  return trimmed
}

export async function getAllTags(): Promise<TagRecord[]> {
  const db = getDb()
  const records = await db.select().from(tags).orderBy(asc(tags.name))
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    colorHex: r.colorHex
  }))
}

export async function getTagById(id: string): Promise<TagRecord | null> {
  const db = getDb()
  const records = await db.select().from(tags).where(eq(tags.id, id))
  if (records.length === 0) return null
  const r = records[0]
  return {
    id: r.id,
    name: r.name,
    colorHex: r.colorHex
  }
}

export async function createTag(input: CreateTagInput): Promise<TagRecord> {
  const db = getDb()
  const validatedName = validateTagName(input.name)
  const validatedColor = validateTagColor(input.colorHex)

  // Case-insensitive duplicate check
  const existing = await db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${validatedName})`)

  if (existing.length > 0) {
    throw new TagValidationError(`Esiste già un tag con il nome "${validatedName}".`)
  }

  const newTag: TagRecord = {
    id: randomUUID(),
    name: validatedName,
    colorHex: validatedColor
  }

  await db.insert(tags).values({
    id: newTag.id,
    name: newTag.name,
    colorHex: newTag.colorHex
  })

  return newTag
}

export async function updateTag(id: string, input: UpdateTagInput): Promise<TagRecord> {
  const db = getDb()
  const current = await getTagById(id)
  if (!current) {
    throw new TagValidationError(`Tag con ID "${id}" non trovato.`)
  }

  const updates: Partial<{ name: string; colorHex: string }> = {}

  if (input.name !== undefined) {
    const validatedName = validateTagName(input.name)
    if (validatedName.toLowerCase() !== current.name.toLowerCase()) {
      const existing = await db
        .select()
        .from(tags)
        .where(sql`lower(${tags.name}) = lower(${validatedName}) AND ${tags.id} != ${id}`)
      if (existing.length > 0) {
        throw new TagValidationError(`Esiste già un tag con il nome "${validatedName}".`)
      }
    }
    updates.name = validatedName
  }

  if (input.colorHex !== undefined) {
    updates.colorHex = validateTagColor(input.colorHex)
  }

  if (Object.keys(updates).length > 0) {
    await db.update(tags).set(updates).where(eq(tags.id, id))
  }

  return {
    id,
    name: updates.name ?? current.name,
    colorHex: updates.colorHex ?? current.colorHex
  }
}

export async function deleteTag(id: string): Promise<boolean> {
  const db = getDb()
  const current = await getTagById(id)
  if (!current) {
    return false
  }

  await db.delete(tags).where(eq(tags.id, id))
  return true
}
