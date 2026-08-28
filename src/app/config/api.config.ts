/**
 * Configuración central de acceso al backend.
 * En el navegador usa el host local por defecto.
 * En Electron puede sobreescribirse con `window.ultronDesktop.apiBaseUrl`
 * (config.json en userData o ULTRON_API_BASE_URL) sin recompilar Angular.
 */
const DEFAULT_BASE_URL = 'http://localhost:8081';

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function readDesktopBaseUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const url = window.ultronDesktop?.apiBaseUrl;
  if (!url) {
    return undefined;
  }

  return normalizeBaseUrl(url);
}

export function resolveApiBaseUrl(): string {
  return readDesktopBaseUrl() ?? DEFAULT_BASE_URL;
}

export const API_CONFIG = {
  get baseUrl(): string {
    return resolveApiBaseUrl();
  },
  get authLoginEndpoint(): string {
    return `${resolveApiBaseUrl()}/api/auth/login`;
  },
  get graphqlEndpoint(): string {
    return `${resolveApiBaseUrl()}/graphql`;
  },
  get reportesEndpoint(): string {
    return `${resolveApiBaseUrl()}/api/reportes`;
  },
};
