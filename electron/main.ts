import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadDesktopConfig } from './config';
import { startStaticServer, type StaticServer } from './static-server';

const DESKTOP_CONFIG = {
  apiBaseUrl: 'http://localhost:8081',
};

const isDev = !app.isPackaged && process.argv.includes('--dev');

let mainWindow: BrowserWindow | undefined;
let staticServer: StaticServer | undefined;

function resolveAngularBrowserDir(): string {
  return path.join(__dirname, '../../dist/ultron-gestion-activos-frontend/browser');
}

function resolveIconPath(): string {
  return path.join(__dirname, '../resources/icon.png');
}

function registerIpc(): void {
  ipcMain.on('desktop:get-config', (event) => {
    event.returnValue = DESKTOP_CONFIG;
  });

  ipcMain.handle('desktop:open-pdf', async (_event, bytes: Uint8Array, filename: string) => {
    const safeName = String(filename || 'reporte.pdf').replace(/[<>:"/\\|?*\u0000]/g, '_');
    const filePath = path.join(app.getPath('temp'), `ultron-reporte-${Date.now()}-${safeName}`);
    await fs.writeFile(filePath, Buffer.from(bytes));

    const win = new BrowserWindow({
      width: 1200,
      height: 860,
      minWidth: 800,
      minHeight: 600,
      autoHideMenuBar: true,
      title: 'Reporte',
      icon: resolveIconPath(),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    await win.loadURL(pathToFileURL(filePath).href);
  });
}

function buildMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Archivo',
      submenu: [{ role: 'quit', label: 'Salir' }],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        ...(isDev ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const, label: 'Herramientas de desarrollo' }] : []),
      ],
    },
  ]);
}

async function resolveStartUrl(): Promise<string> {
  if (isDev) {
    return 'http://localhost:4200';
  }

  staticServer = await startStaticServer(resolveAngularBrowserDir());
  return staticServer.url;
}

async function createWindow(): Promise<void> {
  const icon = resolveIconPath();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'Ultron Gestión de Activos',
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const startUrl = await resolveStartUrl();
  await mainWindow.loadURL(startUrl);
}

function closeStaticServer(): void {
  staticServer?.server.close();
  staticServer = undefined;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Object.assign(DESKTOP_CONFIG, loadDesktopConfig());
    registerIpc();
    await createWindow();
  });

  app.on('window-all-closed', () => {
    closeStaticServer();
    app.quit();
  });

  app.on('before-quit', () => {
    closeStaticServer();
  });
}
