import { resolveApiBaseUrl, API_CONFIG } from './api.config';
import { CONFIGURACION_STORAGE_KEY } from '../shared/models/configuracion-sistema.model';

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

describe('API_CONFIG', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    delete window.ultronDesktop;
  });

  afterEach(() => {
    delete window.ultronDesktop;
    localStorage.removeItem(CONFIGURACION_STORAGE_KEY);
  });

  it('usa el backend local por defecto', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:8081');
    expect(API_CONFIG.graphqlEndpoint).toBe('http://localhost:8081/graphql');
    expect(API_CONFIG.authLoginEndpoint).toBe('http://localhost:8081/api/auth/login');
  });

  it('prioriza la configuración persistida sobre Electron', () => {
    localStorage.setItem(
      CONFIGURACION_STORAGE_KEY,
      JSON.stringify({
        serverIp: '167.99.15.121',
        serverPort: '8081',
        isConfigured: true,
      }),
    );
    window.ultronDesktop = { apiBaseUrl: 'http://192.168.0.10:8081/' };

    expect(API_CONFIG.baseUrl).toBe('http://167.99.15.121:8081');
    expect(API_CONFIG.graphqlEndpoint).toBe('http://167.99.15.121:8081/graphql');
  });

  it('prioriza la URL inyectada por Electron si no hay config persistida', () => {
    window.ultronDesktop = { apiBaseUrl: 'http://192.168.0.10:8081/' };

    expect(API_CONFIG.baseUrl).toBe('http://192.168.0.10:8081');
    expect(API_CONFIG.graphqlEndpoint).toBe('http://192.168.0.10:8081/graphql');
  });
});
