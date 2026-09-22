import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { NotificationService } from './notification.service';
import { ConfiguracionService } from './configuracion.service';
import {
  ImpresionResultado,
  PrinterInfo,
  TicketVenta,
} from '../models/impresion.model';

const IMPRESORA_SELECTION = `{
  name
  displayName
  isDefault
}`;

const RESULTADO_SELECTION = `{
  success
  message
}`;

@Injectable({ providedIn: 'root' })
export class ImpresionService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);
  private readonly configuracion = inject(ConfiguracionService);

  getConfiguredPrinterName(): string {
    return this.configuracion.getConfig().printers?.ticket?.trim() ?? '';
  }

  hasConfiguredPrinter(): boolean {
    return this.getConfiguredPrinterName().length > 0;
  }

  listarImpresoras(): Observable<PrinterInfo[]> {
    return this.listarImpresorasBackend().pipe(
      switchMap((backendPrinters) => {
        if (backendPrinters.length > 0) {
          return of(backendPrinters);
        }
        return this.listarImpresorasElectron();
      }),
      catchError(() => this.listarImpresorasElectron()),
    );
  }

  imprimirPrueba(printerName?: string): Observable<ImpresionResultado> {
    const name = (printerName ?? this.getConfiguredPrinterName()).trim();
    if (!name) {
      const result = { success: false, message: 'Seleccioná una impresora térmica' };
      this.notifications.warning(result.message, { title: 'Impresora' });
      return of(result);
    }

    const document = `mutation($printerName: String!) {
      imprimirPrueba(printerName: $printerName) ${RESULTADO_SELECTION}
    }`;
    return this.gql
      .mutate<{ imprimirPrueba: ImpresionResultado }>(document, { printerName: name })
      .pipe(
        map((data) => this.notifyResult(data.imprimirPrueba, 'Prueba enviada a la impresora')),
        catchError((err: Error) => of(this.notifyResult({
          success: false,
          message: err.message || 'No se pudo imprimir la prueba',
        }, 'Prueba enviada a la impresora'))),
      );
  }

  imprimirTicketVenta(ticket: TicketVenta, printerName?: string): Observable<ImpresionResultado> {
    const name = (printerName ?? this.getConfiguredPrinterName()).trim();
    if (!name) {
      const result = {
        success: false,
        message: 'Configurá la impresora térmica en Configuración del Sistema',
      };
      this.notifications.warning(result.message, { title: 'Impresora' });
      return of(result);
    }

    const document = `mutation($printerName: String!, $ticket: TicketVentaInput!) {
      imprimirTicketVenta(printerName: $printerName, ticket: $ticket) ${RESULTADO_SELECTION}
    }`;
    return this.gql
      .mutate<{ imprimirTicketVenta: ImpresionResultado }>(document, {
        printerName: name,
        ticket,
      })
      .pipe(
        map((data) => this.notifyResult(data.imprimirTicketVenta, 'Ticket enviado a la impresora')),
        catchError((err: Error) => of(this.notifyResult({
          success: false,
          message: err.message || 'No se pudo imprimir el ticket',
        }, 'Ticket enviado a la impresora'))),
      );
  }

  private listarImpresorasElectron(): Observable<PrinterInfo[]> {
    const desktop = typeof window !== 'undefined' ? window.ultronDesktop : undefined;
    if (!desktop?.getPrinters) {
      return of([]);
    }
    return from(desktop.getPrinters()).pipe(
      map((printers) => (printers ?? []).map((printer) => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        isDefault: printer.isDefault === true,
      }))),
      catchError(() => of([])),
    );
  }

  private listarImpresorasBackend(): Observable<PrinterInfo[]> {
    const document = `query {
      listarImpresoras ${IMPRESORA_SELECTION}
    }`;
    return this.gql.query<{ listarImpresoras: PrinterInfo[] }>(document).pipe(
      map((data) => data.listarImpresoras ?? []),
      catchError(() => of([])),
    );
  }

  private notifyResult(result: ImpresionResultado, successFallback: string): ImpresionResultado {
    if (result?.success) {
      this.notifications.success(result.message || successFallback, { title: 'Impresión' });
    } else {
      this.notifications.error(result?.message || 'No se pudo imprimir', { title: 'Impresión' });
    }
    return result;
  }
}
