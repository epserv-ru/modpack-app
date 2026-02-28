const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    chooseDirectory: () => ipcRenderer.invoke('app:choose-directory'),
    ensureFolder: (folderPath) => ipcRenderer.invoke('app:ensure-folder', folderPath),
    saveFile: (filePath, buffer) => ipcRenderer.invoke('app:save-file', filePath, buffer),
    addServers: (minecraftDir, serversArray) => ipcRenderer.invoke('servers:add', minecraftDir, serversArray),
    getDefaultDir: () => ipcRenderer.invoke("app:get-default-dir"),
    isElectron: true,
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    maximizeWindow: () => ipcRenderer.send('window:maximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
});