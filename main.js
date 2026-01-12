const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        center: true, // Start in the middle of the screen
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1E1E1E',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        icon: path.join(__dirname, 'src/assets/icon.png') // Set window icon
    });

    mainWindow.loadFile('src/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}

const menuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open',
                accelerator: 'CmdOrCtrl+O',
                click: () => mainWindow.webContents.send('menu-open-file')
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                click: () => mainWindow.webContents.send('menu-save-file')
            },
            {
                label: 'Save As...',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => mainWindow.webContents.send('menu-save-file-as')
            },
            { type: 'separator' },
            { role: 'quit' }
        ]
    },
    {
        label: 'Edit',
        role: 'editMenu'
    },
    {
        label: 'View',
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
            {
                label: 'Toggle Preview Only',
                accelerator: 'CmdOrCtrl+Shift+P',
                click: () => mainWindow.webContents.send('menu-toggle-preview')
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: () => mainWindow.webContents.send('menu-about')
            }
        ]
    }
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
    createWindow();
    mainWindow.maximize(); // Start full screen size

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('open-file-dialog', async () => {
    try {
        // Removed mainWindow argument to prevent Z-order issues
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { canceled: true };
        }

        const filePath = result.filePaths[0];
        const content = await fs.readFile(filePath, 'utf-8');
        return { canceled: false, filePath, content };
    } catch (error) {
        return { canceled: true, error: error.message };
    }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-file-as-dialog', async (event, content) => {
    try {
        // Removed mainWindow argument to prevent Z-order issues
        const result = await dialog.showSaveDialog({
            filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
        });

        if (result.canceled || !result.filePath) {
            return { canceled: true };
        }

        await fs.writeFile(result.filePath, content, 'utf-8');
        return { canceled: false, filePath: result.filePath, success: true };
    } catch (error) {
        return { canceled: true, error: error.message };
    }
});

ipcMain.handle('rename-file', async (event, oldPath, newName) => {
    try {
        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);

        // Check if new extension is missing, append .md if so
        const ext = path.extname(newPath);
        const finalPath = ext ? newPath : newPath + '.md';

        await fs.rename(oldPath, finalPath);
        return { success: true, newPath: finalPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
