import { ipcMain } from 'electron'
import {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag
} from '../services/tag.service'
import { CreateTagInput, UpdateTagInput, TagRecord } from '../../shared/types'

export function registerTagIpcHandlers(): void {
  ipcMain.handle('tags:get-all', async (): Promise<TagRecord[]> => {
    return await getAllTags()
  })

  ipcMain.handle('tags:get-by-id', async (_, id: string): Promise<TagRecord | null> => {
    return await getTagById(id)
  })

  ipcMain.handle('tags:create', async (_, input: CreateTagInput): Promise<TagRecord> => {
    return await createTag(input)
  })

  ipcMain.handle(
    'tags:update',
    async (_, { id, input }: { id: string; input: UpdateTagInput }): Promise<TagRecord> => {
      return await updateTag(id, input)
    }
  )

  ipcMain.handle('tags:delete', async (_, id: string): Promise<boolean> => {
    return await deleteTag(id)
  })
}
