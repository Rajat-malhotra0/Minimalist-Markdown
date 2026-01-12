const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('open-file-dialog'),
    saveFile: (path, content) => ipcRenderer.invoke('save-file', path, content),
    saveFileAs: (content) => ipcRenderer.invoke('save-file-as-dialog', content),
    renameFile: (oldPath, newName) => ipcRenderer.invoke('rename-file', oldPath, newName),
    onMenuOpen: (callback) => ipcRenderer.on('menu-open-file', (event, ...args) => callback(...args)),
    onMenuSave: (callback) => ipcRenderer.on('menu-save-file', (event, ...args) => callback(...args)),
    onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-file-as', (event, ...args) => callback(...args)),
    onMenuTogglePreview: (callback) => ipcRenderer.on('menu-toggle-preview', (event, ...args) => callback(...args)),
    onMenuAbout: (callback) => ipcRenderer.on('menu-about', (event, ...args) => callback(...args)),
});
