import { ipcMain, dialog, shell } from 'electron'
import { existsSync } from 'fs'
import { extractFileMetadata, normalizeCrossPlatformPath } from '../../core/filesystem/pathUtils'
import { PickedFile, RevealFileResult } from '../../shared/types'

export function registerFileIpcHandlers(): void {
  ipcMain.handle('file:pick-files', async (): Promise<PickedFile[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Seleziona Allegati',
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    return result.filePaths.map((fp) => {
      const meta = extractFileMetadata(fp)
      return {
        filePath: meta.filePath,
        fileName: meta.fileName,
        fileExtension: meta.fileExtension
      }
    })
  })

  ipcMain.handle(
    'file:reveal-in-folder',
    async (_, filePath: string): Promise<RevealFileResult> => {
      if (!filePath) {
        return { success: false, error: 'Percorso non specificato.' }
      }

      const normalized = normalizeCrossPlatformPath(filePath)
      if (!existsSync(normalized)) {
        return {
          success: false,
          error: `Il file non esiste più al percorso: ${filePath}`
        }
      }

      try {
        shell.showItemInFolder(normalized)
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )
}
