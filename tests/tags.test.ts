import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'
import { initDatabase, closeDatabase } from '../src/main/db'
import { tags } from '../src/main/db/schema'
import {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  validateTagName,
  validateTagColor,
  TagValidationError
} from '../src/main/services/tag.service'

describe('Story 03 - Tag Service & Logic', () => {
  beforeEach(async () => {
    const { db } = await initDatabase(':memory:')
    await db.delete(tags)
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('Validation Functions', () => {
    it('should validate and trim valid tag names', () => {
      expect(validateTagName('  YouTube Video  ')).toBe('YouTube Video')
    })

    it('should throw for empty or whitespace-only names', () => {
      expect(() => validateTagName('')).toThrow(TagValidationError)
      expect(() => validateTagName('   ')).toThrow(TagValidationError)
    })

    it('should throw for names exceeding 50 characters', () => {
      const longName = 'a'.repeat(51)
      expect(() => validateTagName(longName)).toThrow(TagValidationError)
    })

    it('should validate and normalize hex color codes', () => {
      expect(validateTagColor('#fff')).toBe('#FFF')
      expect(validateTagColor('#3b82f6')).toBe('#3B82F6')
    })

    it('should throw for invalid hex colors', () => {
      expect(() => validateTagColor('red')).toThrow(TagValidationError)
      expect(() => validateTagColor('#12345')).toThrow(TagValidationError)
      expect(() => validateTagColor('#ZZZZZZ')).toThrow(TagValidationError)
      expect(() => validateTagColor('')).toThrow(TagValidationError)
    })
  })

  describe('CRUD Operations', () => {
    it('should create and retrieve a tag', async () => {
      const created = await createTag({ name: 'Podcast', colorHex: '#8B5CF6' })
      expect(created.id).toBeDefined()
      expect(created.name).toBe('Podcast')
      expect(created.colorHex).toBe('#8B5CF6')

      const fetched = await getTagById(created.id)
      expect(fetched).toEqual(created)
    })

    it('should reject duplicate tag names (case-insensitive)', async () => {
      await createTag({ name: 'Newsletter', colorHex: '#10B981' })

      await expect(
        createTag({ name: 'newsletter', colorHex: '#3B82F6' })
      ).rejects.toThrow(TagValidationError)
    })

    it('should get all tags sorted alphabetically by name', async () => {
      await createTag({ name: 'Zebra Post', colorHex: '#111827' })
      await createTag({ name: 'Alpha Post', colorHex: '#3B82F6' })
      await createTag({ name: 'Beta Post', colorHex: '#F59E0B' })

      const all = await getAllTags()
      expect(all).toHaveLength(3)
      expect(all[0].name).toBe('Alpha Post')
      expect(all[1].name).toBe('Beta Post')
      expect(all[2].name).toBe('Zebra Post')
    })

    it('should update tag name and color', async () => {
      const tag = await createTag({ name: 'Draft', colorHex: '#6B7280' })

      const updated = await updateTag(tag.id, {
        name: 'In Review',
        colorHex: '#EC4899'
      })

      expect(updated.name).toBe('In Review')
      expect(updated.colorHex).toBe('#EC4899')

      const fetched = await getTagById(tag.id)
      expect(fetched?.name).toBe('In Review')
      expect(fetched?.colorHex).toBe('#EC4899')
    })

    it('should reject updating to an existing tag name', async () => {
      const tag1 = await createTag({ name: 'Tag 1', colorHex: '#EF4444' })
      const tag2 = await createTag({ name: 'Tag 2', colorHex: '#3B82F6' })

      await expect(
        updateTag(tag2.id, { name: 'Tag 1' })
      ).rejects.toThrow(TagValidationError)
    })

    it('should delete an existing tag and return true', async () => {
      const tag = await createTag({ name: 'To Delete', colorHex: '#EF4444' })
      const result = await deleteTag(tag.id)
      expect(result).toBe(true)

      const fetched = await getTagById(tag.id)
      expect(fetched).toBeNull()
    })

    it('should return false when deleting a non-existent tag', async () => {
      const result = await deleteTag('non-existent-id')
      expect(result).toBe(false)
    })
  })
})
