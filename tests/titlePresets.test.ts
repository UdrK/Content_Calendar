import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_TITLE_PRESETS,
  TITLE_PRESETS_STORAGE_KEY,
  TITLE_PRESETS_INITIALIZED_KEY,
  extractUniqueTitles,
  getStoredPresets,
  persistPresets
} from '../src/renderer/src/hooks/useTitlePresets'

class MockStorage implements Storage {
  private store: Record<string, string> = {}

  get length() {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
}

describe('Title Presets Utility (No Random Defaults, Seeded from Existing Events)', () => {
  let mockStorage: Storage

  beforeEach(() => {
    mockStorage = new MockStorage()
  })

  it('should have an empty array as default presets (no random defaults)', () => {
    expect(DEFAULT_TITLE_PRESETS).toEqual([])
  })

  it('should return null when storage is not yet initialized', () => {
    const presets = getStoredPresets(mockStorage)
    expect(presets).toBeNull()
  })

  it('should extract unique, non-empty titles without case-insensitive duplicates', () => {
    const raw = ['Post', '  Video YouTube  ', 'post', 'POST', '', '  ', null, undefined, 'Newsletter']
    const unique = extractUniqueTitles(raw)
    expect(unique).toEqual(['Post', 'Video YouTube', 'Newsletter'])
  })

  it('should return empty array when seeded from an empty event list', () => {
    const unique = extractUniqueTitles([])
    expect(unique).toEqual([])
  })

  it('should persist and retrieve custom presets once initialized', () => {
    mockStorage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
    const custom = ['Live Twitch', 'Articolo Blog', 'Podcast Ep. 1']
    persistPresets(custom, mockStorage)

    const loaded = getStoredPresets(mockStorage)
    expect(loaded).toEqual(custom)
  })

  it('should allow an unlimited number of presets', () => {
    mockStorage.setItem(TITLE_PRESETS_INITIALIZED_KEY, 'true')
    const twentyTitles = Array.from({ length: 20 }, (_, i) => `Preset ${i + 1}`)
    persistPresets(twentyTitles, mockStorage)

    const loaded = getStoredPresets(mockStorage)
    expect(loaded).toHaveLength(20)
    expect(loaded).toEqual(twentyTitles)
  })
})
