"use strict";
const electron = require("electron");
const api = {
  ping: () => electron.ipcRenderer.invoke("app:ping"),
  dbHealthCheck: () => electron.ipcRenderer.invoke("db:health-check"),
  tags: {
    getAll: () => electron.ipcRenderer.invoke("tags:get-all"),
    getById: (id) => electron.ipcRenderer.invoke("tags:get-by-id", id),
    create: (input) => electron.ipcRenderer.invoke("tags:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("tags:update", { id, input }),
    delete: (id) => electron.ipcRenderer.invoke("tags:delete", id)
  },
  events: {
    getByRange: (startDate, endDate) => electron.ipcRenderer.invoke("events:get-by-range", { startDate, endDate }),
    getById: (id) => electron.ipcRenderer.invoke("events:get-by-id", id),
    create: (input) => electron.ipcRenderer.invoke("events:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("events:update", { id, input }),
    delete: (id) => electron.ipcRenderer.invoke("events:delete", id)
  },
  fileSystem: {
    pickFiles: () => electron.ipcRenderer.invoke("file:pick-files"),
    revealInFolder: (filePath) => electron.ipcRenderer.invoke("file:reveal-in-folder", filePath)
  },
  retention: {
    getPolicy: () => electron.ipcRenderer.invoke("retention:get-policy"),
    setPolicy: (policy) => electron.ipcRenderer.invoke("retention:set-policy", policy),
    applyRetention: () => electron.ipcRenderer.invoke("retention:apply"),
    getStats: () => electron.ipcRenderer.invoke("attachments:get-stats")
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error("Failed to expose api to main world:", error);
  }
} else {
  window.api = api;
}
