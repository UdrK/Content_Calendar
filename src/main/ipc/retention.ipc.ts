import { ipcMain } from 'electron'
import {
  getRetentionPolicy,
  setRetentionPolicy,
  applyRetentionPolicy,
  getAttachmentStorageStats
} from '../services/attachment.service'
import { RetentionPolicy, RetentionStats, AttachmentStorageStats } from '../../shared/types'

export function registerRetentionIpcHandlers(): void {
  ipcMain.handle('retention:get-policy', async (): Promise<RetentionPolicy> => {
    return await getRetentionPolicy()
  })

  ipcMain.handle(
    'retention:set-policy',
    async (_, policy: RetentionPolicy): Promise<RetentionPolicy> => {
      return await setRetentionPolicy(policy)
    }
  )

  ipcMain.handle('retention:apply', async (): Promise<RetentionStats> => {
    return await applyRetentionPolicy()
  })

  ipcMain.handle('attachments:get-stats', async (): Promise<AttachmentStorageStats> => {
    return await getAttachmentStorageStats()
  })
}
