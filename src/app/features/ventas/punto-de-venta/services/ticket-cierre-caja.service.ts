import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { ImpresionResultado } from '../../../../shared/models/impresion.model';
import { ImpresionService } from '../../../../shared/services/impresion.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { SesionCajaService } from './sesion-caja.service';

@Injectable({ providedIn: 'root' })
export class TicketCierreCajaService {
  private readonly sesionCaja = inject(SesionCajaService);
  private readonly impresion = inject(ImpresionService);
  private readonly notifications = inject(NotificationService);

  /** Pide al backend el ticket de la sesión cerrada y lo manda a la térmica de esta computadora. */
  imprimir(idSesionCaja: number): Observable<ImpresionResultado> {
    return this.sesionCaja.ticketCierre(idSesionCaja).pipe(
      switchMap((ticket) => this.impresion.imprimirTicketCierreCaja(ticket)),
      catchError((err: Error) => {
        const message = err.message || 'No se pudo armar el ticket de cierre';
        this.notifications.error(message, { title: 'Impresión' });
        return of({ success: false, message });
      }),
    );
  }
}
