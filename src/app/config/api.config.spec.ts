import { resolveApiBaseUrl, API_CONFIG } from './api.config';

describe('API_CONFIG', () => {
  afterEach(() => {
    delete window.ultronDesktop;
  });

  it('usa el backend local por defecto', () => {
    expect(resolveApiBaseUrl()).toBe('http://localhost:8081');
    expect(API_CONFIG.graphqlEndpoint).toBe('http://localhost:8081/graphql');
    expect(API_CONFIG.authLoginEndpoint).toBe('http://localhost:8081/api/auth/login');
  });

  it('prioriza la URL inyectada por Electron', () => {
    window.ultronDesktop = { apiBaseUrl: 'http://192.168.0.10:8081/' };

    expect(API_CONFIG.baseUrl).toBe('http://192.168.0.10:8081');
    expect(API_CONFIG.graphqlEndpoint).toBe('http://192.168.0.10:8081/graphql');
  });
});
