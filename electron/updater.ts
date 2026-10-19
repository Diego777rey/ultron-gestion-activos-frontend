import { app, BrowserWindow, ipcMain, nativeImage, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'node:path';

export type UpdateChannel = 'desarrollo' | 'estable';

export interface AppUpdateStatus {
  phase: 'disponible' | 'descargando' | 'error' | 'inactivo';
  version: string;
  percent?: number;
  message?: string;
}

const CHECK_DELAY_MS = 1_500;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

let mainWindow: BrowserWindow | undefined;
let status: AppUpdateStatus | null = null;
let channel: UpdateChannel = 'desarrollo';
let userRequestedInstall = false;
let notifiedVersion: string | null = null;
let listenersReady = false;
let checkTimer: ReturnType<typeof setInterval> | undefined;
let initialCheck: ReturnType<typeof setTimeout> | undefined;

export function bindUpdateWindow(win: BrowserWindow): void {
  mainWindow = win;
  if (status) {
    win.webContents.send('updates:status', status);
  }
}

export function registerUpdateHandlers(): void {
  ipcMain.handle('updates:current', () => status);
  ipcMain.handle('updates:install', () => {
    requestInstall();
  });
  ipcMain.handle('updates:set-channel', (_event, value: unknown) => {
    applyChannel(value === 'estable' ? 'estable' : 'desarrollo');
  });
}

function applyChannel(next: UpdateChannel): void {
  channel = next;
  if (!canCheck()) {
    stopChecks();
    userRequestedInstall = false;
    notifiedVersion = null;
    if (status) {
      status = null;
      publish({ phase: 'inactivo', version: '' });
      status = null;
    }
    return;
  }

  ensureUpdater();
  if (checkTimer) {
    return;
  }
  const check = (): void => {
    if (!canCheck() || status?.phase === 'descargando') {
      return;
    }
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      console.error('[actualizacion]', error);
    });
  };
  initialCheck = setTimeout(check, CHECK_DELAY_MS);
  checkTimer = setInterval(check, CHECK_INTERVAL_MS);
}

function canCheck(): boolean {
  return app.isPackaged && channel === 'estable';
}

function stopChecks(): void {
  if (initialCheck) {
    clearTimeout(initialCheck);
    initialCheck = undefined;
  }
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = undefined;
  }
}

function ensureUpdater(): void {
  if (listenersReady) {
    return;
  }
  listenersReady = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.logger = {
    info: (message?: unknown) => console.info('[actualizacion]', message),
    warn: (message?: unknown) => console.warn('[actualizacion]', message),
    error: (message?: unknown) => console.error('[actualizacion]', message),
    debug: (message: string) => console.debug('[actualizacion]', message),
  };

  autoUpdater.on('update-available', (info) => {
    if (!canCheck() || status?.phase === 'descargando') {
      return;
    }
    if (status?.phase === 'disponible' && status.version === info.version) {
      return;
    }
    publish({ phase: 'disponible', version: info.version });
    showSystemNotification(info.version);
  });

  autoUpdater.on('download-progress', (progress) => {
    if (!canCheck()) {
      return;
    }
    publish({
      phase: 'descargando',
      version: status?.version ?? '',
      percent: clampPercent(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', () => {
    if (!canCheck()) {
      return;
    }
    autoUpdater.quitAndInstall(true, true);
  });

  autoUpdater.on('error', (error: Error, details?: string) => {
    console.error('[actualizacion]', details ?? error);
    if (!userRequestedInstall || !canCheck() || details?.startsWith('Cannot check for updates')) {
      return;
    }
    userRequestedInstall = false;
    publish({
      phase: 'error',
      version: status?.version ?? '',
      message: mensajeError(error),
    });
  });

  app.on('before-quit', () => {
    stopChecks();
  });
}

function requestInstall(): void {
  if (!canCheck() || !status || status.phase === 'descargando' || status.phase === 'inactivo') {
    return;
  }
  userRequestedInstall = true;
  publish({ phase: 'descargando', version: status.version, percent: 0 });
  void autoUpdater.downloadUpdate().catch((error: unknown) => {
    console.error('[actualizacion]', error);
  });
}

function publish(next: AppUpdateStatus): void {
  if (next.phase !== 'inactivo') {
    status = next;
  }
  const win = mainWindow;
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send('updates:status', next);
}

function showSystemNotification(version: string): void {
  if (notifiedVersion === version || !Notification.isSupported()) {
    return;
  }
  notifiedVersion = version;
  const icon = nativeImage.createFromPath(path.join(__dirname, '../resources/icon.png'));
  const notification = new Notification({
    title: 'Hay una nueva versión',
    body: `La versión ${version} de CH-SERVICE ya está disponible. Hacé clic para actualizar.`,
    icon: icon.isEmpty() ? undefined : icon,
  });
  notification.on('click', () => {
    const win = mainWindow;
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.show();
      win.focus();
    }
    requestInstall();
  });
  notification.show();
}

function mensajeError(error: Error): string {
  const text = error.message.toLowerCase();
  if (
    text.includes('enotfound') ||
    text.includes('network') ||
    text.includes('timeout') ||
    text.includes('econnrefused') ||
    text.includes('econnreset')
  ) {
    return 'No hay conexión para descargar la actualización.';
  }
  return 'No se pudo actualizar. Intentá de nuevo.';
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}
