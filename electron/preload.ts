import { contextBridge, ipcRenderer } from 'electron';

interface DesktopConfig {
  apiBaseUrl: string;
}

const config = ipcRenderer.sendSync('desktop:get-config') as DesktopConfig;

contextBridge.exposeInMainWorld('ultronDesktop', {
  apiBaseUrl: config.apiBaseUrl,
  platform: process.platform,
  getPrinters: () => ipcRenderer.invoke('printers:list'),
});
