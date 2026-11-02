import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { createClient, Client } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

let client: Client | null = null
let drizzleDb: LibSQLDatabase<typeof schema> | null = null
let currentDbPath: string = ''

function getElectronApp(): any {
  try {
    // Dynamic require so non-Electron environments (vitest, CLI) don't crash
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('electron').app
  } catch {
    return null
  }
}

export function getDatabasePath(): string {
  if (currentDbPath) return currentDbPath
  try {
    const electronApp = getElectronApp()
    if (electronApp && typeof electronApp.getPath === 'function') {
      const userDataPath = electronApp.getPath('userData')
      mkdirSync(userDataPath, { recursive: true })
      currentDbPath = join(userDataPath, 'content_calendar.sqlite')
      return currentDbPath
    }
  } catch {
    // Fallback to local data folder
  }
  currentDbPath = join(process.cwd(), 'data', 'content_calendar.sqlite')
  mkdirSync(join(process.cwd(), 'data'), { recursive: true })
  return currentDbPath
}

export function formatFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return `file:${normalized}`
}

export async function initDatabase(customPath?: string): Promise<{
  client: Client
  db: LibSQLDatabase<typeof schema>
}> {
  const isMemory = customPath === ':memory:'
  const dbPath = customPath || getDatabasePath()
  currentDbPath = dbPath

  if (!isMemory) {
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  client = createClient({
    url: isMemory ? ':memory:' : formatFileUrl(dbPath)
  })

  // Enable foreign keys
  await client.execute('PRAGMA foreign_keys = ON;')

  // Bootstrap tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color_hex TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_tags (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (event_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS event_attachments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      added_at TEXT NOT NULL
    );
  `)

  // Migration check: handle legacy columns (start_date, end_date, is_all_day)
  const tableInfo = await client.execute("PRAGMA table_info('events');")
  const columnNames = tableInfo.rows.map((r: any) => String(r.name))
  if (columnNames.length > 0) {
    if (!columnNames.includes('date')) {
      await client.execute('ALTER TABLE events ADD COLUMN date TEXT;')
      if (columnNames.includes('start_date')) {
        await client.execute(
          "UPDATE events SET date = substr(start_date, 1, 10) WHERE date IS NULL OR date = '';"
        )
      }
    }
    if (!columnNames.includes('is_done')) {
      await client.execute('ALTER TABLE events ADD COLUMN is_done INTEGER NOT NULL DEFAULT 0;')
    }
    // Drop legacy columns to eliminate NOT NULL constraint failures
    if (columnNames.includes('start_date')) {
      await client.execute('ALTER TABLE events DROP COLUMN start_date;')
    }
    if (columnNames.includes('end_date')) {
      await client.execute('ALTER TABLE events DROP COLUMN end_date;')
    }
    if (columnNames.includes('is_all_day')) {
      await client.execute('ALTER TABLE events DROP COLUMN is_all_day;')
    }
  }

  drizzleDb = drizzle(client, { schema })
  return { client, db: drizzleDb }
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!drizzleDb) {
    throw new Error('Database has not been initialized. Call initDatabase() first.')
  }
  return drizzleDb
}

export function getClient(): Client {
  if (!client) {
    throw new Error('Database client has not been initialized. Call initDatabase() first.')
  }
  return client
}

export function closeDatabase(): void {
  if (client) {
    client.close()
    client = null
    drizzleDb = null
  }
}
