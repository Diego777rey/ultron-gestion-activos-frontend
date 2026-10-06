import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { NotificationService } from './notification.service';
import { ConfiguracionService } from './configuracion.service';
import {
  ImpresionResultado,
  PrinterInfo,
  TicketFactura,
  TicketOrdenTrabajo,
  TicketOrdenTrabajoVehiculo,
  TicketVenta,
} from '../models/impresion.model';
import {
  buildPrueba,
  buildTicketFactura,
  buildTicketOrdenTrabajo,
  buildTicketOrdenTrabajoVehiculo,
  buildTicketVenta,
} from '../printing/escpos-ticket-builder';

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

  /** El nombre del formulario es la impresora de todo el sistema, también del punto de venta. */
  rememberPrinter(name: string): void {
    const ticket = name.trim();
    const current = this.configuracion.getConfig();
    if ((current.printers?.ticket ?? '') === ticket) {
      return;
    }
    this.configuracion.saveConfig({
      ...current,
      printers: { ticket },
    });
  }

  listarImpresoras(): Observable<PrinterInfo[]> {
    if (this.canPrintLocal()) {
      return this.listarImpresorasElectron().pipe(
        switchMap((printers) => (printers.length > 0 ? of(printers) : this.listarImpresorasBackend())),
        catchError(() => this.listarImpresorasBackend()),
      );
    }
    return this.listarImpresorasBackend().pipe(catchError(() => of([])));
  }

  imprimirPrueba(printerName?: string): Observable<ImpresionResultado> {
    const name = (printerName ?? this.getConfiguredPrinterName()).trim();
    if (!name) {
      const result = { success: false, message: 'Seleccioná una impresora térmica' };
      this.notifications.warning(result.message, { title: 'Impresora' });
      return of(result);
    }

    if (this.canPrintLocal()) {
      return this.imprimirLocal(name, buildPrueba(name), 'Prueba enviada a la impresora');
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

    if (this.canPrintLocal()) {
      return this.imprimirLocal(name, buildTicketVenta(ticket), 'Ticket enviado a la impresora');
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

  imprimirFactura(ticket: TicketFactura, printerName?: string): Observable<ImpresionResultado> {
    const name = (printerName ?? this.getConfiguredPrinterName()).trim();
    if (!name) {
      const result = {
        success: false,
        message: 'Configurá la impresora térmica en Configuración del Sistema',
      };
      this.notifications.warning(result.message, { title: 'Impresora' });
      return of(result);
    }
    return this.imprimirLocal(name, buildTicketFactura(ticket), 'Factura enviada a la impresora');
  }

  /** Ticket de recepción de equipos. */
  imprimirTicketOrdenTrabajo(
    ticket: TicketOrdenTrabajo,
    printerName?: string,
  ): Observable<ImpresionResultado> {
    return this.imprimirOrdenTrabajo(buildTicketOrdenTrabajo(ticket), printerName);
  }

  /** Ticket de recepción de vehículos. */
  imprimirTicketOrdenTrabajoVehiculo(
    ticket: TicketOrdenTrabajoVehiculo,
    printerName?: string,
  ): Observable<ImpresionResultado> {
    return this.imprimirOrdenTrabajo(buildTicketOrdenTrabajoVehiculo(ticket), printerName);
  }

  private imprimirOrdenTrabajo(data: Uint8Array, printerName?: string): Observable<ImpresionResultado> {
    const name = (printerName ?? this.getConfiguredPrinterName()).trim();
    if (!name) {
      const result = {
        success: false,
        message: 'Configurá la impresora térmica en Configuración del Sistema',
      };
      this.notifications.warning(result.message, { title: 'Impresora' });
      return of(result);
    }
    return this.imprimirLocal(name, data, 'Orden de trabajo enviada a la impresora');
  }

  private canPrintLocal(): boolean {
    return typeof window !== 'undefined' && typeof window.ultronDesktop?.printRaw === 'function';
  }

  private imprimirLocal(
    printerName: string,
    data: Uint8Array,
    successFallback: string,
  ): Observable<ImpresionResultado> {
    const printRaw = window.ultronDesktop?.printRaw;
    if (!printRaw) {
      return of(this.notifyResult({
        success: false,
        message: 'Abrí la aplicación de escritorio en la computadora que tiene la impresora',
      }, successFallback));
    }
    return from(printRaw(printerName, data)).pipe(
      map((result) => this.notifyResult(result, successFallback)),
      catchError((err: Error) => of(this.notifyResult({
        success: false,
        message: err.message || 'No se pudo imprimir',
      }, successFallback))),
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
