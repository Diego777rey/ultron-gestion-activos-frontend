import { contextBridge, ipcRenderer } from 'electron';

interface DesktopConfig {
  apiBaseUrl: string;
}

const config = ipcRenderer.sendSync('desktop:get-config') as DesktopConfig;

contextBridge.exposeInMainWorld('ultronDesktop', {
  apiBaseUrl: config.apiBaseUrl,
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
});
