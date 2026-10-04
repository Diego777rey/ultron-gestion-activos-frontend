import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { VentaOutput } from '../../interfaces/venta.interface';
import { VentaPosService } from '../../services/venta.service';
import { ReimprimirTicketDialogComponent } from './reimprimir-ticket-dialog.component';

describe('ReimprimirTicketDialogComponent', () => {
  const ventas: VentaOutput[] = [
    venta(49, 'VEN-20261002-8-0001', '2026-10-02T22:08:40'),
    venta(57, 'VEN-20261003-8-0009', '03/10/2026 10:00:00'),
    venta(65, 'VEN-20261004-8-0015', '2026-10-04T21:25:19'),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: VentaPosService,
          useValue: { listarVentasPorSesion: () => of(ventas) },
        },
        {
          provide: LoadingService,
          useValue: { track: <T>(source: Observable<T>) => source },
        },
      ],
    });
  });

  it('muestra la última venta arriba', () => {
    const fixture = TestBed.createComponent(ReimprimirTicketDialogComponent);
    fixture.componentRef.setInput('idSesionCaja', 8);
    fixture.detectChanges();

    const numeros = [
      ...document.body.querySelectorAll('.venta-item__numero'),
    ].map((nodo) => nodo.textContent?.trim());

    expect(numeros).toEqual([
      'VEN-20261004-8-0015',
      'VEN-20261003-8-0009',
      'VEN-20261002-8-0001',
    ]);
  });
});

function venta(id: number, numero: string, fecha: string): VentaOutput {
  return {
    id_venta: id,
    numero,
    fecha,
    subtotal: 1,
    descuento: 0,
    total: 1,
    estado: 'COBRADA',
  };
}
