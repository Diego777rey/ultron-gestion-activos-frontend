import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ImpresionService } from '../../services/impresion.service';
import { ConfiguracionSistemaFormComponent } from './configuracion-sistema-form.component';

describe('ConfiguracionSistemaFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConfiguracionSistemaFormComponent],
      providers: [
        {
          provide: ImpresionService,
          useValue: {
            listarImpresoras: () => of([]),
            rememberPrinter: () => undefined,
            imprimirPrueba: () => of(undefined),
          },
        },
      ],
    });
  });

  afterEach(() => {
    delete window.ultronDesktop;
  });

  it('en desarrollo deja elegir el canal y avisa que no se actualiza', () => {
    delete window.ultronDesktop;
    const fixture = TestBed.createComponent(ConfiguracionSistemaFormComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#canalActualizacion') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('desarrollo');
    expect(fixture.nativeElement.textContent).toContain('En modo desarrollo la aplicación no se actualiza.');

    select.value = 'estable';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(select.value).toBe('estable');
  });

  it('en la aplicación instalada permite elegir producción estable', () => {
    window.ultronDesktop = { apiBaseUrl: 'http://localhost:8081', isPackaged: true };
    const fixture = TestBed.createComponent(ConfiguracionSistemaFormComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#canalActualizacion') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('desarrollo');
    expect(fixture.nativeElement.textContent).toContain('Elegí Producción estable');

    select.value = 'estable';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vas a recibir un aviso cuando haya una versión nueva.');
  });
});
