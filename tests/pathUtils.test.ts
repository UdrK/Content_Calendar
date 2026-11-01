import { describe, it, expect } from 'vitest'
import {
  normalizeCrossPlatformPath,
  extractFileMetadata
} from '../src/core/filesystem/pathUtils'

describe('Story 08 - Path Utilities (Cross-Platform)', () => {
  it('should normalize Windows backslashes to forward slashes', () => {
    const winPath = 'C:\\Users\\costa\\Videos\\review.mp4'
    expect(normalizeCrossPlatformPath(winPath)).toBe('C:/Users/costa/Videos/review.mp4')
  })

  it('should preserve POSIX macOS paths', () => {
    const macPath = '/Users/costa/Documents/post.pdf'
    expect(normalizeCrossPlatformPath(macPath)).toBe('/Users/costa/Documents/post.pdf')
  })

  it('should extract file name, extension, and full path correctly', () => {
    const file1 = extractFileMetadata('C:\\Projects\\Art\\thumbnail.PNG')
    expect(file1.fileName).toBe('thumbnail.PNG')
    expect(file1.fileExtension).toBe('.png')
    expect(file1.filePath).toBe('C:\\Projects\\Art\\thumbnail.PNG')

    const file2 = extractFileMetadata('/var/log/app.tar.gz')
    expect(file2.fileName).toBe('app.tar.gz')
    expect(file2.fileExtension).toBe('.gz')

    const noExt = extractFileMetadata('C:/data/README')
    expect(noExt.fileName).toBe('README')
    expect(noExt.fileExtension).toBe('')
  })
})
