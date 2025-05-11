const { app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const path = require('path');
const { parse, writeUncompressed } = require('prismarine-nbt');
const fs = require('fs/promises');
const zlib = require('zlib');
const { promisify } = require('util');
const {homedir} = require("node:os");
let mainWindow;
const gzip = promisify(zlib.gzip);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        show: false,
        icon: path.join(__dirname, "assets", "img", "icons", "256x256.png"),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadURL("http://localhost:5173/");
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.maximize();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle("app:get-default-dir", async () => {
    return getDefaultDir();
});

ipcMain.handle('app:choose-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('app:save-file', async (_, filePath, buffer) => {
    await fs.writeFile(filePath, Buffer.from(buffer));
    return true;
});

ipcMain.handle('app:ensure-folder', async (_event, folderPath) => {
    try {
        await fs.access(folderPath).catch(async () => {
            await fs.mkdir(folderPath, { recursive: true });
        });
        return true;
    } catch (error) {
        console.error('Ошибка при создании папки:', error);
        return false;
    }
});

ipcMain.handle('servers:add', (_evt, dir, newServers) =>
    addServers(dir, newServers)
        .then(() => ({ success: true }))
        .catch(err => ({ success: false, error: err.message }))
);

function getDefaultDir() {
    const homeDir = homedir();
    let dir = path.resolve(homeDir, ".minecraft");

    const platform = process.platform;

    if (platform === "win32") {
        const appData = process.env.APPDATA;
        if (appData) {
            dir = path.resolve(appData, ".minecraft");
        }
    } else if (platform === "darwin") {
        dir = path.resolve(homeDir, "Library", "Application Support", "minecraft");
    } else if (platform === "linux") {
        const flatPack = path.resolve(
            homeDir,
            ".var",
            "app",
            "com.mojang.Minecraft",
            ".minecraft"
        );
        if (fs.existsSync(flatPack)) {
            dir = flatPack;
        }
    }

    return path.resolve(dir);
}

async function addServers(dir, newServers) {
    try {
        const filePath = path.join(dir, 'servers.dat');
        const raw = await fs.readFile(filePath);
        const isGzipped = raw[0] === 0x1f && raw[1] === 0x8b;
        const { parsed, type } = await parse(raw);
        const root = parsed.value;
        const serversListTag = root.servers;
        const listArray      = serversListTag.value.value;

        const existingIps = new Set(
            listArray.map(tag => tag.ip.value)
        );

        newServers.forEach((srv, idx) => {
            if (!existingIps.has(srv.ip)) {
                const newCompound = {
                    name:               { type: 'string', value: srv.name },
                    hidden:             { type: 'byte',   value: srv.hidden ? 1 : 0 },
                    acceptTextures:     { type: 'byte',   value: srv.acceptTextures ? 1 : 0 },
                    preventsChatReports:{ type: 'byte',   value: srv.preventsChatReports ? 1 : 0 },
                    ip:                 { type: 'string', value: srv.ip },
                };
                listArray.splice(idx, 0, newCompound);
            }
        });

        const uncompressed = await writeUncompressed(parsed, type);
        const finalBuf = isGzipped ? await gzip(uncompressed) : uncompressed;
        await fs.writeFile(filePath, finalBuf);
    } catch (err) {
        console.error(err)
    }
}