export interface DesktopPrinterInfo {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault: boolean;
}

export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
  readonly platform?: string;
  getPrinters?: () => Promise<DesktopPrinterInfo[]>;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
