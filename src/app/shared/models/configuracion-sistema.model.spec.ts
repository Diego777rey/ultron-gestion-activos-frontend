import { readStoredConfiguracion, CONFIGURACION_STORAGE_KEY } from './configuracion-sistema.model';

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
}

describe('readStoredConfiguracion', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('lee la impresora de ticket persistida', () => {
    localStorage.setItem(
      CONFIGURACION_STORAGE_KEY,
      JSON.stringify({
        serverIp: 'localhost',
        serverPort: '8081',
        isConfigured: true,
        printers: { ticket: 'TICKET58' },
      }),
    );

    expect(readStoredConfiguracion()).toEqual({
      serverIp: 'localhost',
      serverPort: '8081',
      isConfigured: true,
      printers: { ticket: 'TICKET58' },
    });
  });

  it('tolera configuraciones viejas sin impresoras', () => {
    localStorage.setItem(
      CONFIGURACION_STORAGE_KEY,
      JSON.stringify({
        serverIp: 'localhost',
        serverPort: '8081',
        isConfigured: true,
      }),
    );

    expect(readStoredConfiguracion()?.printers).toEqual({ ticket: '' });
  });
});
