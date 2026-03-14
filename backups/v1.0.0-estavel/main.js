import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "RDSN - Industrial Intelligence Hub",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            partition: 'persist:main',
            devTools: true
        }
    });

    // Força abertura em modo destacado (janela separada) para não fechar no reload
    win.webContents.on('dom-ready', () => {
        win.webContents.openDevTools({ mode: 'detach' });
    });

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

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
