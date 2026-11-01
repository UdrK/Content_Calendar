"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const client$1 = require("@libsql/client");
const libsql = require("drizzle-orm/libsql");
const sqliteCore = require("drizzle-orm/sqlite-core");
const crypto = require("crypto");
const drizzleOrm = require("drizzle-orm");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
const events = sqliteCore.sqliteTable("events", {
  id: sqliteCore.text("id").primaryKey(),
  type: sqliteCore.text("type").$type().notNull(),
  title: sqliteCore.text("title").notNull(),
  description: sqliteCore.text("description"),
  date: sqliteCore.text("date").notNull(),
  metadata: sqliteCore.text("metadata"),
  createdAt: sqliteCore.text("created_at").notNull(),
  updatedAt: sqliteCore.text("updated_at").notNull()
});
const tags = sqliteCore.sqliteTable("tags", {
  id: sqliteCore.text("id").primaryKey(),
  name: sqliteCore.text("name").notNull().unique(),
  colorHex: sqliteCore.text("color_hex").notNull()
});
const eventTags = sqliteCore.sqliteTable(
  "event_tags",
  {
    eventId: sqliteCore.text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    tagId: sqliteCore.text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => [sqliteCore.primaryKey({ columns: [table.eventId, table.tagId] })]
);
const eventAttachments = sqliteCore.sqliteTable("event_attachments", {
  id: sqliteCore.text("id").primaryKey(),
  eventId: sqliteCore.text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  filePath: sqliteCore.text("file_path").notNull(),
  fileName: sqliteCore.text("file_name").notNull(),
  fileExtension: sqliteCore.text("file_extension").notNull(),
  addedAt: sqliteCore.text("added_at").notNull()
});
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  eventAttachments,
  eventTags,
  events,
  tags
}, Symbol.toStringTag, { value: "Module" }));
let client = null;
let drizzleDb = null;
let currentDbPath = "";
function getElectronApp() {
  try {
    return require("electron").app;
  } catch {
    return null;
  }
}
function getDatabasePath() {
  if (currentDbPath) return currentDbPath;
  try {
    const electronApp2 = getElectronApp();
    if (electronApp2 && typeof electronApp2.getPath === "function") {
      const userDataPath = electronApp2.getPath("userData");
      fs.mkdirSync(userDataPath, { recursive: true });
      currentDbPath = path.join(userDataPath, "content_calendar.sqlite");
      return currentDbPath;
    }
  } catch {
  }
  currentDbPath = path.join(process.cwd(), "data", "content_calendar.sqlite");
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  return currentDbPath;
}
function formatFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return `file:${normalized}`;
}
async function initDatabase(customPath) {
  const dbPath = getDatabasePath();
  currentDbPath = dbPath;
  {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  client = client$1.createClient({
    url: formatFileUrl(dbPath)
  });
  await client.execute("PRAGMA foreign_keys = ON;");
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
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
  `);
  const tableInfo = await client.execute("PRAGMA table_info('events');");
  const columnNames = tableInfo.rows.map((r) => String(r.name));
  if (columnNames.length > 0) {
    if (!columnNames.includes("date")) {
      await client.execute("ALTER TABLE events ADD COLUMN date TEXT;");
      if (columnNames.includes("start_date")) {
        await client.execute(
          "UPDATE events SET date = substr(start_date, 1, 10) WHERE date IS NULL OR date = '';"
        );
      }
    }
    if (columnNames.includes("start_date")) {
      await client.execute("ALTER TABLE events DROP COLUMN start_date;");
    }
    if (columnNames.includes("end_date")) {
      await client.execute("ALTER TABLE events DROP COLUMN end_date;");
    }
    if (columnNames.includes("is_all_day")) {
      await client.execute("ALTER TABLE events DROP COLUMN is_all_day;");
    }
  }
  drizzleDb = libsql.drizzle(client, { schema });
  return { client, db: drizzleDb };
}
function getDb() {
  if (!drizzleDb) {
    throw new Error("Database has not been initialized. Call initDatabase() first.");
  }
  return drizzleDb;
}
function getClient() {
  if (!client) {
    throw new Error("Database client has not been initialized. Call initDatabase() first.");
  }
  return client;
}
function closeDatabase() {
  if (client) {
    client.close();
    client = null;
    drizzleDb = null;
  }
}
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
class TagValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TagValidationError";
  }
}
function validateTagName(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new TagValidationError("Il nome del tag non può essere vuoto.");
  }
  if (trimmed.length > 50) {
    throw new TagValidationError("Il nome del tag non può superare i 50 caratteri.");
  }
  return trimmed;
}
function validateTagColor(colorHex) {
  const trimmed = colorHex?.trim().toUpperCase();
  if (!trimmed || !HEX_COLOR_REGEX.test(trimmed)) {
    throw new TagValidationError("Il colore del tag deve essere un codice HEX valido (es. #3B82F6).");
  }
  return trimmed;
}
async function getAllTags() {
  const db = getDb();
  const records = await db.select().from(tags).orderBy(drizzleOrm.asc(tags.name));
  return records.map((r) => ({
    id: r.id,
    name: r.name,
    colorHex: r.colorHex
  }));
}
async function getTagById(id) {
  const db = getDb();
  const records = await db.select().from(tags).where(drizzleOrm.eq(tags.id, id));
  if (records.length === 0) return null;
  const r = records[0];
  return {
    id: r.id,
    name: r.name,
    colorHex: r.colorHex
  };
}
async function createTag(input) {
  const db = getDb();
  const validatedName = validateTagName(input.name);
  const validatedColor = validateTagColor(input.colorHex);
  const existing = await db.select().from(tags).where(drizzleOrm.sql`lower(${tags.name}) = lower(${validatedName})`);
  if (existing.length > 0) {
    throw new TagValidationError(`Esiste già un tag con il nome "${validatedName}".`);
  }
  const newTag = {
    id: crypto.randomUUID(),
    name: validatedName,
    colorHex: validatedColor
  };
  await db.insert(tags).values({
    id: newTag.id,
    name: newTag.name,
    colorHex: newTag.colorHex
  });
  return newTag;
}
async function updateTag(id, input) {
  const db = getDb();
  const current = await getTagById(id);
  if (!current) {
    throw new TagValidationError(`Tag con ID "${id}" non trovato.`);
  }
  const updates = {};
  if (input.name !== void 0) {
    const validatedName = validateTagName(input.name);
    if (validatedName.toLowerCase() !== current.name.toLowerCase()) {
      const existing = await db.select().from(tags).where(drizzleOrm.sql`lower(${tags.name}) = lower(${validatedName}) AND ${tags.id} != ${id}`);
      if (existing.length > 0) {
        throw new TagValidationError(`Esiste già un tag con il nome "${validatedName}".`);
      }
    }
    updates.name = validatedName;
  }
  if (input.colorHex !== void 0) {
    updates.colorHex = validateTagColor(input.colorHex);
  }
  if (Object.keys(updates).length > 0) {
    await db.update(tags).set(updates).where(drizzleOrm.eq(tags.id, id));
  }
  return {
    id,
    name: updates.name ?? current.name,
    colorHex: updates.colorHex ?? current.colorHex
  };
}
async function deleteTag(id) {
  const db = getDb();
  const current = await getTagById(id);
  if (!current) {
    return false;
  }
  await db.delete(tags).where(drizzleOrm.eq(tags.id, id));
  return true;
}
function registerTagIpcHandlers() {
  electron.ipcMain.handle("tags:get-all", async () => {
    return await getAllTags();
  });
  electron.ipcMain.handle("tags:get-by-id", async (_, id) => {
    return await getTagById(id);
  });
  electron.ipcMain.handle("tags:create", async (_, input) => {
    return await createTag(input);
  });
  electron.ipcMain.handle(
    "tags:update",
    async (_, { id, input }) => {
      return await updateTag(id, input);
    }
  );
  electron.ipcMain.handle("tags:delete", async (_, id) => {
    return await deleteTag(id);
  });
}
class EventValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "EventValidationError";
  }
}
function validateEventTitle(title) {
  const trimmed = title?.trim();
  if (!trimmed) {
    throw new EventValidationError("Il titolo dell'evento non può essere vuoto.");
  }
  if (trimmed.length > 200) {
    throw new EventValidationError("Il titolo dell'evento non può superare i 200 caratteri.");
  }
  return trimmed;
}
function validateEventDate(date) {
  const trimmed = date?.trim();
  if (!trimmed) {
    throw new EventValidationError("La data dell'evento è obbligatoria.");
  }
  const parsed = new Date(trimmed).getTime();
  if (isNaN(parsed)) {
    throw new EventValidationError("La data dell'evento non è valida.");
  }
  return trimmed;
}
async function getEventsByDateRange(startDate, endDate) {
  const db = getDb();
  const eventRecords = await db.select().from(events).where(
    drizzleOrm.and(
      drizzleOrm.gte(events.date, startDate),
      drizzleOrm.lte(events.date, endDate)
    )
  );
  if (eventRecords.length === 0) return [];
  const eventIds = eventRecords.map((e) => e.id);
  const tagsRelations = await db.select({
    eventId: eventTags.eventId,
    tagId: tags.id,
    name: tags.name,
    colorHex: tags.colorHex
  }).from(eventTags).innerJoin(tags, drizzleOrm.eq(eventTags.tagId, tags.id)).where(drizzleOrm.inArray(eventTags.eventId, eventIds));
  const attachmentsList = await db.select().from(eventAttachments).where(drizzleOrm.inArray(eventAttachments.eventId, eventIds));
  const tagsByEvent = /* @__PURE__ */ new Map();
  for (const rel of tagsRelations) {
    if (!tagsByEvent.has(rel.eventId)) tagsByEvent.set(rel.eventId, []);
    tagsByEvent.get(rel.eventId).push({
      id: rel.tagId,
      name: rel.name,
      colorHex: rel.colorHex
    });
  }
  const attachmentsByEvent = /* @__PURE__ */ new Map();
  for (const att of attachmentsList) {
    if (!attachmentsByEvent.has(att.eventId)) attachmentsByEvent.set(att.eventId, []);
    attachmentsByEvent.get(att.eventId).push({
      id: att.id,
      eventId: att.eventId,
      filePath: att.filePath,
      fileName: att.fileName,
      fileExtension: att.fileExtension,
      addedAt: att.addedAt
    });
  }
  return eventRecords.map((rec) => ({
    ...rec,
    tags: tagsByEvent.get(rec.id) ?? [],
    attachments: attachmentsByEvent.get(rec.id) ?? []
  }));
}
async function getEventById(id) {
  const db = getDb();
  const records = await db.select().from(events).where(drizzleOrm.eq(events.id, id));
  if (records.length === 0) return null;
  const rec = records[0];
  const eventTagsList = await db.select({
    id: tags.id,
    name: tags.name,
    colorHex: tags.colorHex
  }).from(eventTags).innerJoin(tags, drizzleOrm.eq(eventTags.tagId, tags.id)).where(drizzleOrm.eq(eventTags.eventId, id));
  const attachmentsList = await db.select().from(eventAttachments).where(drizzleOrm.eq(eventAttachments.eventId, id));
  return {
    ...rec,
    tags: eventTagsList,
    attachments: attachmentsList.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      filePath: a.filePath,
      fileName: a.fileName,
      fileExtension: a.fileExtension,
      addedAt: a.addedAt
    }))
  };
}
async function createEvent(input) {
  const db = getDb();
  const validatedTitle = validateEventTitle(input.title);
  const validatedDate = validateEventDate(input.date);
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const type = input.attachments && input.attachments.length > 0 || input.type === "attachment" ? "attachment" : "simple";
  await db.insert(events).values({
    id,
    type,
    title: validatedTitle,
    description: input.description ?? null,
    date: validatedDate,
    createdAt: now,
    updatedAt: now
  });
  const assignedTags = [];
  if (input.tagIds && input.tagIds.length > 0) {
    for (const tagId of input.tagIds) {
      await db.insert(eventTags).values({
        eventId: id,
        tagId
      });
    }
    const fetchedTags = await db.select().from(tags).where(drizzleOrm.inArray(tags.id, input.tagIds));
    assignedTags.push(...fetchedTags);
  }
  const createdAttachments = [];
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      const attId = crypto.randomUUID();
      await db.insert(eventAttachments).values({
        id: attId,
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      });
      createdAttachments.push({
        id: attId,
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      });
    }
  }
  return {
    id,
    type,
    title: validatedTitle,
    description: input.description ?? null,
    date: validatedDate,
    createdAt: now,
    updatedAt: now,
    tags: assignedTags,
    attachments: createdAttachments
  };
}
async function updateEvent(id, input) {
  const db = getDb();
  const current = await getEventById(id);
  if (!current) {
    throw new EventValidationError(`Evento con ID "${id}" non trovato.`);
  }
  const updates = {
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.title !== void 0) {
    updates.title = validateEventTitle(input.title);
  }
  if (input.description !== void 0) {
    updates.description = input.description;
  }
  if (input.date !== void 0) {
    updates.date = validateEventDate(input.date);
  }
  if (input.attachments !== void 0) {
    updates.type = input.attachments.length > 0 ? "attachment" : "simple";
  }
  await db.update(events).set(updates).where(drizzleOrm.eq(events.id, id));
  if (input.tagIds !== void 0) {
    await db.delete(eventTags).where(drizzleOrm.eq(eventTags.eventId, id));
    if (input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        await db.insert(eventTags).values({
          eventId: id,
          tagId
        });
      }
    }
  }
  if (input.attachments !== void 0) {
    await db.delete(eventAttachments).where(drizzleOrm.eq(eventAttachments.eventId, id));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const att of input.attachments) {
      await db.insert(eventAttachments).values({
        id: crypto.randomUUID(),
        eventId: id,
        filePath: att.filePath,
        fileName: att.fileName,
        fileExtension: att.fileExtension,
        addedAt: now
      });
    }
  }
  const updated = await getEventById(id);
  return updated;
}
async function deleteEvent(id) {
  const db = getDb();
  const current = await getEventById(id);
  if (!current) return false;
  await db.delete(events).where(drizzleOrm.eq(events.id, id));
  return true;
}
function registerEventIpcHandlers() {
  electron.ipcMain.handle(
    "events:get-by-range",
    async (_, { startDate, endDate }) => {
      return await getEventsByDateRange(startDate, endDate);
    }
  );
  electron.ipcMain.handle(
    "events:get-by-id",
    async (_, id) => {
      return await getEventById(id);
    }
  );
  electron.ipcMain.handle(
    "events:create",
    async (_, input) => {
      return await createEvent(input);
    }
  );
  electron.ipcMain.handle(
    "events:update",
    async (_, { id, input }) => {
      return await updateEvent(id, input);
    }
  );
  electron.ipcMain.handle("events:delete", async (_, id) => {
    return await deleteEvent(id);
  });
}
function normalizeCrossPlatformPath(inputPath) {
  if (!inputPath) return "";
  return inputPath.replace(/\\/g, "/");
}
function extractFileMetadata(fullPath) {
  const normalized = normalizeCrossPlatformPath(fullPath);
  const segments = normalized.split("/");
  const fileName = segments[segments.length - 1] || "";
  const lastDotIndex = fileName.lastIndexOf(".");
  const fileExtension = lastDotIndex > 0 ? fileName.slice(lastDotIndex).toLowerCase() : "";
  return {
    filePath: fullPath,
    fileName,
    fileExtension
  };
}
function registerFileIpcHandlers() {
  electron.ipcMain.handle("file:pick-files", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Seleziona Allegati",
      properties: ["openFile", "multiSelections"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    return result.filePaths.map((fp) => {
      const meta = extractFileMetadata(fp);
      return {
        filePath: meta.filePath,
        fileName: meta.fileName,
        fileExtension: meta.fileExtension
      };
    });
  });
  electron.ipcMain.handle(
    "file:reveal-in-folder",
    async (_, filePath) => {
      if (!filePath) {
        return { success: false, error: "Percorso non specificato." };
      }
      const normalized = normalizeCrossPlatformPath(filePath);
      if (!fs.existsSync(normalized)) {
        return {
          success: false,
          error: `Il file non esiste più al percorso: ${filePath}`
        };
      }
      try {
        electron.shell.showItemInFolder(normalized);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
  );
}
function registerIpcHandlers() {
  electron.ipcMain.handle("app:ping", async () => {
    return "pong";
  });
  electron.ipcMain.handle("db:health-check", async () => {
    try {
      const client2 = getClient();
      const dbPath = getDatabasePath();
      const result = await client2.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      return {
        status: "ok",
        path: dbPath,
        tablesCount: result.rows.length
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        path: getDatabasePath(),
        tablesCount: 0,
        error: message
      };
    }
  });
  registerTagIpcHandlers();
  registerEventIpcHandlers();
  registerFileIpcHandlers();
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "Content Calendar",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.contentcalendar.app");
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  await initDatabase();
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDatabase();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  closeDatabase();
});
