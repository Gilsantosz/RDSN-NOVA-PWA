const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onNavigate: (callback) => ipcRenderer.on('navigate', (_event, value) => callback(value))
});
