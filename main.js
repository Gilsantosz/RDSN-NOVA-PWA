import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_VERSION = app.getVersion();

// ─────────────────────────────────────────────
// AUTO-UPDATER — ativo apenas em produção
// ─────────────────────────────────────────────
let autoUpdater = null;

async function initAutoUpdater(win) {
    if (!app.isPackaged) return; // desativado em dev

    try {
        const updaterModule = await import('electron-updater');
        autoUpdater = updaterModule.autoUpdater;

        // Feed de atualização via GitHub Releases
        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'Gilsantosz',
            repo: 'RDSN-NOVA-PWA',
        });

        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.allowPrerelease = false;

        autoUpdater.on('checking-for-update', () => {
            win.webContents.send('update-status', { status: 'checking' });
        });

        autoUpdater.on('update-available', (info) => {
            win.webContents.send('update-status', {
                status: 'available',
                version: info.version,
            });
        });

        autoUpdater.on('update-not-available', () => {
            win.webContents.send('update-status', { status: 'up-to-date' });
        });

        autoUpdater.on('download-progress', (progress) => {
            win.webContents.send('update-status', {
                status: 'downloading',
                percent: Math.round(progress.percent),
                bytesPerSecond: progress.bytesPerSecond,
            });
        });

        autoUpdater.on('update-downloaded', (info) => {
            win.webContents.send('update-status', {
                status: 'downloaded',
                version: info.version,
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('[AutoUpdater] Erro:', err.message);
            win.webContents.send('update-status', {
                status: 'error',
                message: err.message,
            });
        });

        // Checa 5s após iniciar; repete a cada 6h
        setTimeout(() => autoUpdater.checkForUpdates(), 5000);
        setInterval(() => autoUpdater.checkForUpdates(), 6 * 60 * 60 * 1000);

    } catch (e) {
        console.warn('[AutoUpdater] Módulo não disponível:', e.message);
    }
}

// IPC: frontend pede instalação imediata (reiniciar + instalar)
ipcMain.handle('update-install-now', () => {
    if (autoUpdater) autoUpdater.quitAndInstall(false, true);
});

// IPC: frontend consulta versão atual
ipcMain.handle('get-app-version', () => APP_VERSION);

// ─────────────────────────────────────────────
// JANELA PRINCIPAL
// ─────────────────────────────────────────────
function createWindow() {
    const isDev = !app.isPackaged || process.argv.includes('--dev');

    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        title: `RDSN NOVA v${APP_VERSION}`,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        trafficLightPosition: { x: 15, y: 15 },
        icon: path.join(__dirname, isDev ? 'build/icon.png' : 'dist/electron-icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            devTools: isDev,
        },
    });

    // ── Carrega a UI ──
    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((e) => {
            console.error('[Main] Falha ao carregar index.html:', e);
        });
    }

    // ── Menu nativo ──
    const template = [
        {
            label: 'RDSN NOVA',
            submenu: [
                { label: `Versão ${APP_VERSION}`, enabled: false },
                { type: 'separator' },
                { label: 'Voltar ao Login', click: () => win.webContents.send('navigate', '/access') },
                { type: 'separator' },
                { label: 'Sair', role: 'quit' },
            ],
        },
        {
            label: 'Módulos',
            submenu: [
                { label: 'Dashboard', click: () => win.webContents.send('navigate', '/') },
                { label: 'Produção / Baixas', click: () => win.webContents.send('navigate', '/producao') },
                { label: 'PCP Kanban', click: () => win.webContents.send('navigate', '/pcp-kanban') },
                { label: 'Programação Mensal', click: () => win.webContents.send('navigate', '/pcp-programacao-mensal') },
                { type: 'separator' },
                { label: 'Agendamentos', click: () => win.webContents.send('navigate', '/agendamento') },
            ],
        },
        {
            label: 'Visualização',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Atualização',
            submenu: [
                {
                    label: 'Verificar Atualização',
                    click: () => {
                        if (autoUpdater && app.isPackaged) {
                            autoUpdater.checkForUpdates();
                        } else {
                            win.webContents.send('update-status', { status: 'checking' });
                        }
                    },
                },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    return win;
}

// ─────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────
app.whenReady().then(() => {
    const win = createWindow();
    initAutoUpdater(win);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
