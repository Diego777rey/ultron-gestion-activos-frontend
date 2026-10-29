import { contextBridge, ipcRenderer } from 'electron';

interface DesktopConfig {
  apiBaseUrl: string;
  isPackaged?: boolean;
}

const config = ipcRenderer.sendSync('desktop:get-config') as DesktopConfig;

contextBridge.exposeInMainWorld('ultronDesktop', {
  apiBaseUrl: config.apiBaseUrl,
  isPackaged: config.isPackaged === true,
  platform: process.platform,
  getPrinters: () => ipcRenderer.invoke('printers:list'),
  printRaw: (printerName: string, data: Uint8Array) =>
    ipcRenderer.invoke('printers:print-raw', printerName, Array.from(data)),
  shareWhatsAppFile: (pdfBase64: string, filename: string) =>
    ipcRenderer.invoke('whatsapp:share-file', pdfBase64, filename),
  getZoom: () => ipcRenderer.invoke('zoom:get') as Promise<number>,
  zoomIn: () => ipcRenderer.invoke('zoom:in') as Promise<number>,
  zoomOut: () => ipcRenderer.invoke('zoom:out') as Promise<number>,
  resetZoom: () => ipcRenderer.invoke('zoom:reset') as Promise<number>,
  onZoomChanged: (callback: (factor: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, factor: number) => callback(factor);
    ipcRenderer.on('zoom:changed', listener);
    return () => ipcRenderer.removeListener('zoom:changed', listener);
  },
  onAppUpdate: (
    callback: (status: {
      phase: 'disponible' | 'descargando' | 'error' | 'inactivo';
      version: string;
      percent?: number;
      message?: string;
    }) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: {
        phase: 'disponible' | 'descargando' | 'error' | 'inactivo';
        version: string;
        percent?: number;
        message?: string;
      },
    ) => callback(status);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  },
  installAppUpdate: () => ipcRenderer.invoke('updates:install') as Promise<void>,
  setUpdateChannel: (channel: 'desarrollo' | 'estable') =>
    ipcRenderer.invoke('updates:set-channel', channel) as Promise<void>,
  currentAppUpdate: () =>
    ipcRenderer.invoke('updates:current') as Promise<{
      phase: 'disponible' | 'descargando' | 'error' | 'inactivo';
      version: string;
      percent?: number;
      message?: string;
    } | null>,
  onSystemResumed: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('system:resumed', listener);
    return () => ipcRenderer.removeListener('system:resumed', listener);
  },
});
