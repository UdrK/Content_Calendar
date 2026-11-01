import { ipcMain } from 'electron'
import { getDatabasePath, getClient } from '../db'
import { DbHealthCheckResult } from '../../shared/types'
import { registerTagIpcHandlers } from './tag.ipc'
import { registerEventIpcHandlers } from './event.ipc'
import { registerFileIpcHandlers } from './file.ipc'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:ping', async () => {
    return 'pong'
  })

  ipcMain.handle('db:health-check', async (): Promise<DbHealthCheckResult> => {
    try {
      const client = getClient()
      const dbPath = getDatabasePath()
      const result = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )

      return {
        status: 'ok',
        path: dbPath,
        tablesCount: result.rows.length
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        status: 'error',
        path: getDatabasePath(),
        tablesCount: 0,
        error: message
      }
    }
  })

  // Register domain handlers
  registerTagIpcHandlers()
  registerEventIpcHandlers()
  registerFileIpcHandlers()
}
