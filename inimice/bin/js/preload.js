/*
const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (contents) => ipcRenderer.send('saveFile', contents)
})
*/

// preload with contextIsolation disabled
