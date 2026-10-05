import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadDesktopConfig } from './config';
import { printRaw } from './raw-printer';
import { startStaticServer, type StaticServer } from './static-server';
import { sharePdfOnWhatsApp } from './whatsapp-share';

const DESKTOP_CONFIG = {
  apiBaseUrl: 'http://localhost:8081',
};

const isDev = !app.isPackaged && process.argv.includes('--dev');

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

let mainWindow: BrowserWindow | undefined;
let staticServer: StaticServer | undefined;

function clampZoom(factor: number): number {
  const rounded = Math.round(factor * 100) / 100;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
}

function zoomFile(): string {
  return path.join(app.getPath('userData'), 'zoom-factor.json');
}

function readSavedZoom(): number {
  try {
    const raw = fs.readFileSync(zoomFile(), 'utf8');
    const factor = Number((JSON.parse(raw) as { factor?: unknown }).factor);
    if (Number.isFinite(factor)) {
      return clampZoom(factor);
    }
  } catch {
    // Primera ejecución: tamaño real.
  }
  return 1;
}

function persistZoom(factor: number): void {
  try {
    fs.writeFileSync(zoomFile(), JSON.stringify({ factor }));
  } catch {
    // El zoom queda aplicado aunque no se pueda guardar.
  }
}

function publishZoom(factor: number): number {
  const next = clampZoom(factor);
  const win = mainWindow;
  if (!win) {
    return next;
  }
  win.webContents.setZoomFactor(next);
  persistZoom(next);
  win.webContents.send('zoom:changed', next);
  return next;
}

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

  ipcMain.handle('printers:list', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    if (!win) {
      return [];
    }
    const printers = await win.webContents.getPrintersAsync();
    return printers.map((printer) => {
      const options = printer.options as unknown as Record<string, string | undefined>;
      return {
        name: printer.name,
        displayName: printer.displayName || printer.name,
        description: printer.description,
        isDefault: options?.['printer-is-default'] === 'true' || options?.['is_default'] === 'true',
      };
    });
  });

  ipcMain.handle('printers:print-raw', async (_event, printerName: unknown, data: unknown) => {
    try {
      if (typeof printerName !== 'string' || !printerName.trim()) {
        return { success: false, message: 'Indicá el nombre de la impresora térmica' };
      }
      const buffer = toPrintBuffer(data);
      if (!buffer || buffer.length === 0) {
        return { success: false, message: 'El ticket está vacío' };
      }
      const name = printerName.trim();
      await printRaw(name, buffer);
      return { success: true, message: `Ticket enviado a la impresora (${name})` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo imprimir';
      return { success: false, message };
    }
  });

  ipcMain.handle('zoom:get', () => mainWindow?.webContents.getZoomFactor() ?? readSavedZoom());
  ipcMain.handle('zoom:in', () =>
    publishZoom((mainWindow?.webContents.getZoomFactor() ?? 1) + ZOOM_STEP),
  );
  ipcMain.handle('zoom:out', () =>
    publishZoom((mainWindow?.webContents.getZoomFactor() ?? 1) - ZOOM_STEP),
  );
  ipcMain.handle('zoom:reset', () => publishZoom(1));

  ipcMain.handle('whatsapp:share-file', async (_event, pdfBase64: unknown, filename: unknown) => {
    try {
      if (typeof pdfBase64 !== 'string' || !pdfBase64) {
        return { success: false, message: 'El PDF está vacío' };
      }
      const buffer = Buffer.from(pdfBase64, 'base64');
      if (!buffer.length) {
        return { success: false, message: 'El PDF está vacío' };
      }
      const name = typeof filename === 'string' && filename.trim() ? filename.trim() : 'presupuesto.pdf';
      await sharePdfOnWhatsApp(buffer, name);
      return { success: true, message: 'WhatsApp abierto con el presupuesto' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo abrir WhatsApp';
      return { success: false, message };
    }
  });
}

function toPrintBuffer(data: unknown): Buffer | null {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (Array.isArray(data) && data.every((value) => typeof value === 'number')) {
    return Buffer.from(data);
  }
  return null;
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
        { type: 'separator' },
        { role: 'zoomIn', label: 'Acercar', accelerator: 'CommandOrControl+=' },
        { role: 'zoomOut', label: 'Alejar', accelerator: 'CommandOrControl+-' },
        { role: 'resetZoom', label: 'Tamaño real', accelerator: 'CommandOrControl+0' },
        { type: 'separator' },
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
    title: 'CH-SERVICE',
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

  mainWindow.webContents.on('zoom-changed', () => {
    const factor = clampZoom(mainWindow?.webContents.getZoomFactor() ?? 1);
    persistZoom(factor);
    mainWindow?.webContents.send('zoom:changed', factor);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const startUrl = await resolveStartUrl();
  await mainWindow.loadURL(startUrl);
  publishZoom(readSavedZoom());
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
