import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppDialogService } from './app-dialog.service';
import { ReporteVisorService } from './reporte-visor.service';

describe('ReporteVisorService', () => {
  let visor: ReporteVisorService;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let closeAll: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateByUrl = vi.fn().mockResolvedValue(true);
    closeAll = vi.fn();
    createObjectURL = vi.fn().mockReturnValue('blob:reporte-1');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    TestBed.configureTestingModule({
      providers: [
        ReporteVisorService,
        { provide: Router, useValue: { navigateByUrl } },
        { provide: AppDialogService, useValue: { closeAll } },
      ],
    });
    visor = TestBed.inject(ReporteVisorService);
  });

  afterEach(() => {
    visor.limpiar();
    vi.unstubAllGlobals();
  });

  it('abre el PDF, lo deja activo y navega al visor', () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const id = visor.abrir({
      titulo: 'Listado de transferencias',
      filename: 'reporte-transferencias.pdf',
      blob,
    });

    expect(id).toBeTruthy();
    expect(visor.sesiones()).toHaveLength(1);
    expect(visor.sesionActiva()?.titulo).toBe('Listado de transferencias');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(closeAll).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/reportes/visor');
  });

  it('al cerrar el activo selecciona el siguiente', () => {
    vi.mocked(createObjectURL)
      .mockReturnValueOnce('blob:a')
      .mockReturnValueOnce('blob:b');

    const primero = visor.abrir({
      titulo: 'Primero',
      filename: 'a.pdf',
      blob: new Blob(['a']),
    });
    const segundo = visor.abrir({
      titulo: 'Segundo',
      filename: 'b.pdf',
      blob: new Blob(['b']),
    });

    expect(visor.activaId()).toBe(segundo);
    visor.cerrar(segundo);
    expect(visor.activaId()).toBe(primero);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:b');
    expect(visor.sesiones()).toHaveLength(1);
  });
});
