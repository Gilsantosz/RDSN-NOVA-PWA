import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const isDev = !app.isPackaged || process.argv.includes('--dev');
    
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "PCP Matrix - Industrial Intelligence Suite",
        icon: path.join(__dirname, isDev ? 'public/pcp-matrix-icon.png' : 'dist/electron-icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            devTools: isDev
        }
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        win.loadFile(indexPath).catch(e => {
            console.error('Failed to load production HTML:', e);
        });
    }

    // NATIVE MENU CONFIGURATION FOR INDUSTRIAL SUITE
    const template = [
        {
            label: 'PCP Matrix',
            submenu: [
                { label: 'Voltar ao Login', click: () => win.webContents.send('navigate', '/access') },
                { type: 'separator' },
                { label: 'Sair', role: 'quit' }
            ]
        },
        {
            label: 'Suíte PCP',
            submenu: [
                { label: 'Dashboard Industrial', click: () => win.webContents.send('navigate', '/pcp') },
                { label: 'Kanban Dinâmico', click: () => win.webContents.send('navigate', '/pcp-kanban') },
                { label: 'Programação Mensal', click: () => win.webContents.send('navigate', '/pcp-programacao-mensal') },
                { label: 'Simulador de Plano', click: () => win.webContents.send('navigate', '/pcp-simulacao-plano') },
                { type: 'separator' },
                { label: 'Agendamentos', click: () => win.webContents.send('navigate', '/agendamento') }
            ]
        },
        {
            label: 'Visualização',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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
