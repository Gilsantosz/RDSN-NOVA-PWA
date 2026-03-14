import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "v2.0.0 RDSN - Industrial Intelligence Hub",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            devTools: false
        }
    });

    // Desativado: win.webContents.on('dom-ready', () => { ... });

    // Load Vite's dev server if running in development
    if (process.defaultApp || process.argv.includes('--dev')) {
        win.loadURL('http://localhost:5173');
    } else {
        // In production, load the built index.html with absolute path
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        console.log('Loading production HTML from:', indexPath);
        win.loadFile(indexPath).catch(e => {
            console.error('Failed to load local HTML:', e);
        });
    }
}

app.whenReady().then(async () => {
    const { session } = await import('electron');
    // RIGOROUS SESSION CLEARING ON STARTUP
    try {
        await session.defaultSession.clearStorageData({
            storages: ['localstorage', 'cookies', 'sessionstorage', 'indexdb', 'cachestorage'],
        });
        console.log('App storage cleared successfully on startup');
    } catch (err) {
        console.error('Failed to clear storage:', err);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
