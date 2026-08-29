export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
  openPdf?(bytes: Uint8Array, filename: string): Promise<void>;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
