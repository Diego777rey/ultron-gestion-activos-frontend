import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { CONFIGURACION_STORAGE_KEY } from '../../shared/models/configuracion-sistema.model';
import {
  ConectividadService,
  clasificarErrorDeRed,
} from './conectividad.service';

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

describe('clasificarErrorDeRed', () => {
  it('prioriza la falta de red de esta PC', () => {
    expect(clasificarErrorDeRed(new HttpErrorResponse({ status: 0 }), false)).toBe('sin-red');
    expect(clasificarErrorDeRed(new Error('timeout'), false)).toBe('sin-red');
  });

  it('trata la falta de respuesta como servidor inalcanzable si la PC tiene red', () => {
    expect(clasificarErrorDeRed(new HttpErrorResponse({ status: 0 }), true)).toBe('sin-servidor');
    expect(clasificarErrorDeRed(new HttpErrorResponse({ status: 503 }), true)).toBe('sin-servidor');
    expect(clasificarErrorDeRed(new Error('timeout'), true)).toBe('sin-servidor');
  });

  it('cuenta como en línea cualquier respuesta HTTP del proceso', () => {
    expect(clasificarErrorDeRed(new HttpErrorResponse({ status: 401 }), true)).toBe('en-linea');
    expect(clasificarErrorDeRed(new HttpErrorResponse({ status: 500 }), true)).toBe('en-linea');
  });
});

describe('ConectividadService', () => {
  let service: ConectividadService;
  let http: HttpTestingController;
  let enLinea = true;

  beforeEach(() => {
    enLinea = true;
    installMemoryLocalStorage();
    localStorage.removeItem(CONFIGURACION_STORAGE_KEY);
    delete window.ultronDesktop;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => enLinea,
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConectividadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http?.verify();
    localStorage.removeItem(CONFIGURACION_STORAGE_KEY);
    delete window.ultronDesktop;
    Reflect.deleteProperty(window.navigator, 'onLine');
  });

  it('queda en línea cuando el servidor responde', () => {
    service.reintentar();

    const req = http.expectOne('http://localhost:8081/api/health');
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'UP' });

    expect(service.estado()).toBe('en-linea');
    expect(service.etiqueta()).toBe('En línea');
    expect(service.detalle()).toContain('localhost:8081');
  });

  it('marca sin internet y no llama al servidor si esta PC no tiene red', () => {
    enLinea = false;

    service.reintentar();

    http.expectNone('http://localhost:8081/api/health');
    expect(service.estado()).toBe('sin-red');
    expect(service.etiqueta()).toBe('Sin internet');
  });

  it('marca sin servidor cuando hay red pero no hay respuesta', () => {
    service.reintentar();

    const req = http.expectOne('http://localhost:8081/api/health');
    req.flush('down', { status: 503, statusText: 'Service Unavailable' });

    expect(service.estado()).toBe('sin-servidor');
    expect(service.etiqueta()).toBe('Sin servidor');
    expect(service.detalle()).toContain('puede estar caído');
  });

  it('pasa a sin internet en cuanto el navegador avisa que se fue la red', () => {
    service.iniciar();
    http.expectOne('http://localhost:8081/api/health').flush({ status: 'UP' });
    expect(service.estado()).toBe('en-linea');

    enLinea = false;
    window.dispatchEvent(new Event('offline'));

    expect(service.estado()).toBe('sin-red');
  });
});
