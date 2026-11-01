export interface FileMetadata {
  filePath: string
  fileName: string
  fileExtension: string
}

export function normalizeCrossPlatformPath(inputPath: string): string {
  if (!inputPath) return ''
  // Normalize Windows and Unix path separators
  return inputPath.replace(/\\/g, '/')
}

export function extractFileMetadata(fullPath: string): FileMetadata {
  const normalized = normalizeCrossPlatformPath(fullPath)
  const segments = normalized.split('/')
  const fileName = segments[segments.length - 1] || ''

  const lastDotIndex = fileName.lastIndexOf('.')
  const fileExtension =
    lastDotIndex > 0 ? fileName.slice(lastDotIndex).toLowerCase() : ''

  return {
    filePath: fullPath,
    fileName,
    fileExtension
  }
}
