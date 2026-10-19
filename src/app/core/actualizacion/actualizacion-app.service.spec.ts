import { TestBed } from '@angular/core/testing';
import { AppUpdateStatus } from '../../../types/ultron-desktop';
import { CONFIGURACION_STORAGE_KEY } from '../../shared/models/configuracion-sistema.model';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ActualizacionAppService } from './actualizacion-app.service';

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

describe('ActualizacionAppService', () => {
  let listener: ((status: AppUpdateStatus) => void) | undefined;
  let installs = 0;
  let current: AppUpdateStatus | null = null;
  const channels: string[] = [];

  beforeEach(() => {
    installs = 0;
    listener = undefined;
    current = null;
    channels.length = 0;
    installMemoryLocalStorage();
    window.ultronDesktop = {
      apiBaseUrl: 'http://localhost:8081',
      onAppUpdate: (callback) => {
        listener = callback;
        return () => undefined;
      },
      installAppUpdate: () => {
        installs += 1;
        return Promise.resolve();
      },
      currentAppUpdate: () => Promise.resolve(current),
      setUpdateChannel: (channel) => {
        channels.push(channel);
        return Promise.resolve();
      },
    };
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    delete window.ultronDesktop;
  });

  it('mantiene el aviso hasta que el usuario lo activa y entonces instala', () => {
    const service = TestBed.inject(ActualizacionAppService);
    const notifications = TestBed.inject(NotificationService);
    service.iniciar();

    listener?.({ phase: 'disponible', version: '9.9.9' });

    const aviso = notifications.notifications()[0];
    expect(aviso.title).toBe('Hay una nueva versión');
    expect(aviso.duration).toBe(0);
    expect(aviso.pinned).toBe(true);
    expect(aviso.message).toContain('9.9.9');
    expect(aviso.actionLabel).toBe('Actualizar');

    aviso.action?.();

    expect(installs).toBe(1);
    expect(notifications.notifications()[0].message).toContain('0%');
    expect(notifications.notifications()[0].action).toBeUndefined();
  });

  it('actualiza el mismo aviso con el avance de la descarga', () => {
    const service = TestBed.inject(ActualizacionAppService);
    const notifications = TestBed.inject(NotificationService);
    service.iniciar();
    listener?.({ phase: 'disponible', version: '2.0.0' });
    const id = notifications.notifications()[0].id;

    listener?.({ phase: 'descargando', version: '2.0.0', percent: 40 });

    expect(notifications.notifications()).toHaveLength(1);
    expect(notifications.notifications()[0].id).toBe(id);
    expect(notifications.notifications()[0].message).toContain('40%');
    expect(notifications.notifications()[0].progress).toBe(40);
  });

  it('si la descarga falla, avisa y vuelve a ofrecer la actualización', () => {
    const service = TestBed.inject(ActualizacionAppService);
    const notifications = TestBed.inject(NotificationService);
    service.iniciar();
    listener?.({ phase: 'disponible', version: '2.0.0' });
    listener?.({ phase: 'descargando', version: '2.0.0', percent: 10 });

    listener?.({ phase: 'error', version: '2.0.0', message: 'No hay conexión para descargar la actualización.' });

    const textos = notifications.notifications().map((item) => item.message);
    expect(textos).toContain('No hay conexión para descargar la actualización.');
    const oferta = notifications.notifications().find((item) => item.actionLabel === 'Actualizar');
    expect(oferta?.message).toContain('2.0.0');
  });

  it('al volver a desarrollo cierra el aviso de actualización', () => {
    const service = TestBed.inject(ActualizacionAppService);
    const notifications = TestBed.inject(NotificationService);
    service.iniciar();
    listener?.({ phase: 'disponible', version: '2.0.0' });

    listener?.({ phase: 'inactivo', version: '' });

    expect(notifications.notifications()).toHaveLength(0);
  });

  it('comunica el canal guardado y el cambio a producción estable', () => {
    localStorage.setItem(
      CONFIGURACION_STORAGE_KEY,
      JSON.stringify({
        serverIp: 'localhost',
        serverPort: '8081',
        isConfigured: true,
        printers: { ticket: '' },
        canalActualizacion: 'desarrollo',
      }),
    );
    const service = TestBed.inject(ActualizacionAppService);
    const configuracion = TestBed.inject(ConfiguracionService);
    service.iniciar();

    expect(channels).toEqual(['desarrollo']);

    configuracion.saveConfig({
      ...configuracion.getConfig(),
      canalActualizacion: 'estable',
    });

    expect(channels).toEqual(['desarrollo', 'estable']);
  });

  it('no hace nada si la app no corre en el escritorio', () => {
    delete window.ultronDesktop;
    const service = TestBed.inject(ActualizacionAppService);
    const notifications = TestBed.inject(NotificationService);

    service.iniciar();

    expect(notifications.notifications()).toHaveLength(0);
  });
});
