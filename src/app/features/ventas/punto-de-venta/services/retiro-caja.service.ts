import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RetiroCajaInput, RetiroCajaOutput } from '../interfaces/sesion-caja.interface';

const RETIRO_SELECTION = `{
  id_retiro_caja
  idSesionCaja
  moneda
  monto
  observacion
  fecha
  idUsuarioResponsable
  responsableUsuario
  responsableNombre
  registradoPor
}`;

/** Retiros de efectivo de una sesión de caja; el backend valida que haya efectivo suficiente. */
@Injectable({ providedIn: 'root' })
export class RetiroCajaService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);

  registrar(input: RetiroCajaInput): Observable<RetiroCajaOutput> {
    const document = `mutation($input: RetiroCajaInput!) {
      registrarRetiroCaja(input: $input) ${RETIRO_SELECTION}
    }`;
    return this.gql
      .mutate<{ registrarRetiroCaja: RetiroCajaOutput }>(document, { input })
      .pipe(
        map((data) => data.registrarRetiroCaja),
        map((retiro) => {
          this.notifications.success('Retiro registrado correctamente');
          return retiro;
        }),
      );
  }

  listarPorSesion(idSesionCaja: number): Observable<RetiroCajaOutput[]> {
    const document = `query($idSesionCaja: ID!) {
      listarRetirosPorSesion(idSesionCaja: $idSesionCaja) ${RETIRO_SELECTION}
    }`;
    return this.gql
      .query<{ listarRetirosPorSesion: RetiroCajaOutput[] }>(document, { idSesionCaja })
      .pipe(map((data) => data.listarRetirosPorSesion ?? []));
  }
}
