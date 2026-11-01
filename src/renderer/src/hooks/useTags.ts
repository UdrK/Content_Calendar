import { useState, useEffect, useCallback } from 'react'
import { TagRecord, CreateTagInput, UpdateTagInput } from '@shared/types'

export interface UseTagsReturn {
  tags: TagRecord[]
  loading: boolean
  error: string | null
  fetchTags: () => Promise<void>
  createTag: (input: CreateTagInput) => Promise<TagRecord>
  updateTag: (id: string, input: UpdateTagInput) => Promise<TagRecord>
  deleteTag: (id: string) => Promise<boolean>
  clearError: () => void
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<TagRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const fetchTags = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (window.api?.tags) {
        const result = await window.api.tags.getAll()
        setTags(result)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createTag = useCallback(async (input: CreateTagInput): Promise<TagRecord> => {
    setError(null)
    try {
      if (!window.api?.tags) {
        throw new Error('API non disponibile')
      }
      const newTag = await window.api.tags.create(input)
      setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      return newTag
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    }
  }, [])

  const updateTag = useCallback(
    async (id: string, input: UpdateTagInput): Promise<TagRecord> => {
      setError(null)
      try {
        if (!window.api?.tags) {
          throw new Error('API non disponibile')
        }
        const updated = await window.api.tags.update(id, input)
        setTags((prev) =>
          prev
            .map((t) => (t.id === id ? updated : t))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
        return updated
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw err
      }
    },
    []
  )

  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      if (!window.api?.tags) {
        throw new Error('API non disponibile')
      }
      const success = await window.api.tags.delete(id)
      if (success) {
        setTags((prev) => prev.filter((t) => t.id !== id))
      }
      return success
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    clearError
  }
}
