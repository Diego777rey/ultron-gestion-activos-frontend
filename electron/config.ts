import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DesktopConfig {
  apiBaseUrl: string;
}

const DEFAULT_CONFIG: DesktopConfig = {
  apiBaseUrl: 'http://localhost:8081',
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/**
 * Resuelve la URL del backend sin recompilar Angular.
 * Orden: variable de entorno, config.json en userData, valor por defecto.
 */
export function loadDesktopConfig(): DesktopConfig {
  const fromEnv = process.env['ULTRON_API_BASE_URL'];
  if (fromEnv && fromEnv.trim().length > 0) {
    return { apiBaseUrl: normalizeBaseUrl(fromEnv) };
  }

  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<DesktopConfig>;
    if (typeof parsed.apiBaseUrl === 'string' && parsed.apiBaseUrl.trim().length > 0) {
      return { apiBaseUrl: normalizeBaseUrl(parsed.apiBaseUrl) };
    }
  } catch {
    // Primera ejecución o JSON inválido: se usa el backend local por defecto.
  }

  return DEFAULT_CONFIG;
}
