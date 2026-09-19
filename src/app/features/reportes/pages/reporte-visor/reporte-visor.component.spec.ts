import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReporteVisorComponent } from './reporte-visor.component';
import { ReporteVisorService } from '../../../../shared/services/reporte-visor.service';

describe('ReporteVisorComponent', () => {
  let fixture: ComponentFixture<ReporteVisorComponent>;
  const visorMock = {
    sesiones: signal([]),
    activaId: signal<string | null>(null),
    sesionActiva: signal(null),
    seleccionar: vi.fn(),
    cerrar: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteVisorComponent],
      providers: [{ provide: ReporteVisorService, useValue: visorMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteVisorComponent);
    await fixture.whenStable();
  });

  it('muestra el estado vacío cuando no hay reportes', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Últimos reportes');
    expect(text).toContain('Todavía no hay reportes en esta sesión.');
    expect(text).toContain('Generá un reporte desde cualquier listado para verlo aquí.');
  });
});
