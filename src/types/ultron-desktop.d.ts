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

export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
  readonly platform?: string;
  getPrinters?: () => Promise<DesktopPrinterInfo[]>;
  printRaw?: (printerName: string, data: Uint8Array) => Promise<DesktopPrintResult>;
  shareWhatsAppFile?: (pdfBase64: string, filename: string) => Promise<DesktopCommandResult>;
  getZoom?: () => Promise<number>;
  zoomIn?: () => Promise<number>;
  zoomOut?: () => Promise<number>;
  resetZoom?: () => Promise<number>;
  onZoomChanged?: (callback: (factor: number) => void) => () => void;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
