export interface ConfiguracionPrinters {
  ticket: string;
}

/** Desarrollo no busca releases. Estable avisa y permite instalar la versión publicada. */
export type CanalActualizacion = 'desarrollo' | 'estable';

export interface ConfiguracionSistema {
  serverIp: string;
  serverPort: string;
  isConfigured: boolean;
  printers: ConfiguracionPrinters;
  canalActualizacion: CanalActualizacion;
}

export const CONFIGURACION_STORAGE_KEY = 'ultron-configuracion-sistema';
export const CONFIGURACION_BACKUP_STORAGE_KEY = 'ultron-configuracion-sistema-backup';

export const DEFAULT_CONFIGURACION: ConfiguracionSistema = {
  serverIp: 'localhost',
  serverPort: '8081',
  isConfigured: false,
  printers: { ticket: '' },
  canalActualizacion: 'desarrollo',
};

export function normalizeCanalActualizacion(value: unknown): CanalActualizacion {
  return value === 'estable' ? 'estable' : 'desarrollo';
}

export function readStoredConfiguracion(): ConfiguracionSistema | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw =
    localStorage.getItem(CONFIGURACION_STORAGE_KEY) ??
    localStorage.getItem(CONFIGURACION_BACKUP_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ConfiguracionSistema> & {
      printers?: Partial<ConfiguracionPrinters>;
    };
    const serverIp = parsed.serverIp?.trim();
    const serverPort = parsed.serverPort?.trim();
    if (!serverIp || !serverPort) {
      return null;
    }
    return {
      serverIp,
      serverPort,
      isConfigured: parsed.isConfigured === true,
      printers: {
        ticket: parsed.printers?.ticket?.trim() ?? '',
      },
      canalActualizacion: normalizeCanalActualizacion(parsed.canalActualizacion),
    };
  } catch {
    return null;
  }
}

export function buildApiBaseUrl(serverIp: string, serverPort: string): string {
  return `http://${serverIp.trim()}:${serverPort.trim()}`;
}
