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

export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
  readonly platform?: string;
  getPrinters?: () => Promise<DesktopPrinterInfo[]>;
  printRaw?: (printerName: string, data: Uint8Array) => Promise<DesktopPrintResult>;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
