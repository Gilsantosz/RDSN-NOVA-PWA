const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Navegação por menu nativo
    onNavigate: (callback) =>
        ipcRenderer.on('navigate', (_event, value) => callback(value)),

    // ── Auto-updater ──────────────────────────────────────
    /** Recebe eventos de status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date' */
    onUpdateStatus: (callback) =>
        ipcRenderer.on('update-status', (_event, payload) => callback(payload)),

    /** Solicita instalação imediata (reinicia e instala) */
    installUpdate: () => ipcRenderer.invoke('update-install-now'),

    /** Retorna a versão atual do app */
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
