/**
 * Configuración central de acceso al backend.
 *
 * Prioridad:
 * 1. Configuración persistida (engranaje / localStorage)
 * 2. Electron `window.ultronDesktop.apiBaseUrl`
 * 3. localhost:8081
 */
import {
  DEFAULT_CONFIGURACION,
  buildApiBaseUrl,
  readStoredConfiguracion,
} from '../shared/models/configuracion-sistema.model';

const DEFAULT_BASE_URL = buildApiBaseUrl(
  DEFAULT_CONFIGURACION.serverIp,
  DEFAULT_CONFIGURACION.serverPort,
);

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function readPersistedBaseUrl(): string | undefined {
  const config = readStoredConfiguracion();
  if (!config) {
    return undefined;
  }
  return buildApiBaseUrl(config.serverIp, config.serverPort);
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
  return readPersistedBaseUrl() ?? readDesktopBaseUrl() ?? DEFAULT_BASE_URL;
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
