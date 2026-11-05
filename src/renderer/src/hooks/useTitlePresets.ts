import { useState, useCallback, useEffect } from 'react'

export const TITLE_PRESETS_STORAGE_KEY = 'content_calendar_title_presets_v2'
export const TITLE_PRESETS_INITIALIZED_KEY = 'content_calendar_title_presets_initialized_v2'
export const DEFAULT_TITLE_PRESETS: string[] = []

/**
 * Extracts distinct non-empty titles, ignoring whitespace and case-insensitive duplicates.
 */
export function extractUniqueTitles(titles: (string | undefined | null)[]): string[] {
  const result: string[] = []
  for (const raw of titles) {
    const trimmed = raw?.trim()
    if (trimmed && !result.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      result.push(trimmed)
    }
  }
  return result
}

export function getStoredPresets(
  storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null
): string[] | null {
  try {
    if (storage) {
      const isInitialized = storage.getItem(TITLE_PRESETS_INITIALIZED_KEY) === 'true'
      if (!isInitialized) {
        return null
      }
      const saved = storage.getItem(TITLE_PRESETS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        }
      }
      return []
    }
  } catch (err) {
    console.warn('Failed to read title presets from storage', err)
  }
  return null
}

export function persistPresets(
  presets: string[],
  storage: Storage | null = typeof window !== 'undefined' ? window.localStorage : null
): void {
  try {
    if (storage) {
      storage.setItem(TITLE_PRESETS_STORAGE_KEY, JSON.stringify(presets))
    }
  } catch (err) {
    console.warn('Failed to write title presets to storage', err)
  }
}

export function useTitlePresets() {
  const [presets, setPresets] = useState<string[]>(() => {
    const fromStorage = getStoredPresets()
    return fromStorage ?? DEFAULT_TITLE_PRESETS
  })

  // Seed presets from existing calendar events on first launch (if not initialized yet)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storage = window.localStorage
    if (!storage) return

    // Clean legacy random presets key if present
    try {
      storage.removeItem('content_calendar_title_presets')
    } catch (_) {
      // ignore
    }

    const isInitialized = storage.getItem(TITLE_PRESETS_INITIALIZED_KEY) === 'true'
    if (isInitialized) {
      return
    }

    if (window.api?.events?.getByRange) {
      window.api.events
        .getByRange('1970-01-01', '2099-12-31')
        .then((events) => {
          const seeded = extractUniqueTitles((events || []).map((e) => e.title))
          setPresets(seeded)
          persistPresets(seeded, storage)
          storage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
        })
        .catch((err) => {
          console.warn('Failed to seed presets from existing events', err)
          setPresets([])
          persistPresets([], storage)
          storage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
        })
    } else {
      setPresets([])
      persistPresets([], storage)
      storage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
    }
  }, [])

  const addPreset = useCallback((preset: string): boolean => {
    const trimmed = preset.trim()
    if (!trimmed) return false

    setPresets((prev) => {
      if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      const updated = [...prev, trimmed]
      persistPresets(updated)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
      }
      return updated
    })
    return true
  }, [])

  const removePreset = useCallback((presetToRemove: string) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p !== presetToRemove)
      persistPresets(updated)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
      }
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setPresets(DEFAULT_TITLE_PRESETS)
    persistPresets(DEFAULT_TITLE_PRESETS)
  }, [])

  return {
    presets,
    addPreset,
    removePreset,
    resetToDefaults
  }
}
