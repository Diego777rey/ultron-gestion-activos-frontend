export interface UltronDesktopApi {
  readonly apiBaseUrl: string;
}

declare global {
  interface Window {
    ultronDesktop?: UltronDesktopApi;
  }
}

export {};
