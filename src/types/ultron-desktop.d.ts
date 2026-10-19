export interface DesktopPrinterInfo {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault: boolean;
}

export interface DesktopPrintResult {
  success: boolean;
  message?: string | null;
}

export interface DesktopCommandResult {
  success: boolean;
  message?: string | null;
}

export interface AppUpdateStatus {
  phase: 'disponible' | 'descargando' | 'error' | 'inactivo';
  version: string;
  percent?: number;
  message?: string;
}

export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
  readonly isPackaged?: boolean;
  readonly platform?: string;
  getPrinters?: () => Promise<DesktopPrinterInfo[]>;
  printRaw?: (printerName: string, data: Uint8Array) => Promise<DesktopPrintResult>;
  shareWhatsAppFile?: (pdfBase64: string, filename: string) => Promise<DesktopCommandResult>;
  getZoom?: () => Promise<number>;
  zoomIn?: () => Promise<number>;
  zoomOut?: () => Promise<number>;
  resetZoom?: () => Promise<number>;
  onZoomChanged?: (callback: (factor: number) => void) => () => void;
  onAppUpdate?: (callback: (status: AppUpdateStatus) => void) => () => void;
  installAppUpdate?: () => Promise<void>;
  setUpdateChannel?: (channel: 'desarrollo' | 'estable') => Promise<void>;
  currentAppUpdate?: () => Promise<AppUpdateStatus | null>;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
