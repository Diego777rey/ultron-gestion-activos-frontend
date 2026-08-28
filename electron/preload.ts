import { contextBridge, ipcRenderer } from 'electron';

interface DesktopConfig {
  apiBaseUrl: string;
}

const config = ipcRenderer.sendSync('desktop:get-config') as DesktopConfig;

contextBridge.exposeInMainWorld('ultronDesktop', {
  apiBaseUrl: config.apiBaseUrl,
  openPdf: (bytes: Uint8Array, filename: string) =>
    ipcRenderer.invoke('desktop:open-pdf', bytes, filename) as Promise<void>,
});
