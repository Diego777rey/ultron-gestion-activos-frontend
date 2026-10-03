import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header';
import { version } from '../../../../../package.json';
import {
  ConectividadService,
  EstadoConexion,
} from '../../../core/conectividad/conectividad.service';

describe('HeaderComponent', () => {
  const estado = signal<EstadoConexion>('en-linea');
  const etiqueta = signal('En línea');
  const detalle = signal('Conectado a localhost:8081. El servidor responde.');
  let reintentos = 0;

  beforeEach(() => {
    estado.set('en-linea');
    etiqueta.set('En línea');
    reintentos = 0;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ConectividadService,
          useValue: {
            estado,
            etiqueta,
            detalle,
            iniciar: () => undefined,
            reintentar: () => {
              reintentos += 1;
            },
          },
        },
      ],
    });
  });

  it('muestra la versión del package.json, que es la que publica el release', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.app-version');
    expect(badge?.textContent?.trim()).toBe(`v${version}`);
  });

  it('muestra el estado de conexión y vuelve a comprobar al hacer clic', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const indicador = (fixture.nativeElement as HTMLElement).querySelector(
      '.conexion-indicador',
    ) as HTMLButtonElement;
    expect(indicador.textContent).toContain('En línea');
    expect(indicador.classList.contains('conexion-en-linea')).toBe(true);
    expect(indicador.title).toContain('localhost:8081');

    estado.set('sin-servidor');
    etiqueta.set('Sin servidor');
    fixture.detectChanges();

    expect(indicador.textContent).toContain('Sin servidor');
    expect(indicador.classList.contains('conexion-sin-servidor')).toBe(true);

    indicador.click();
    expect(reintentos).toBe(1);
  });
});
