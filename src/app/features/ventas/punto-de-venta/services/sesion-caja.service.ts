import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  AbrirCajaInput,
  CerrarCajaInput,
  SesionCajaOutput,
} from '../interfaces/sesion-caja.interface';

const SESION_SELECTION = `{
  id_sesion_caja
  estado
  montoInicialPyg
  montoInicialUsd
  montoInicialBrl
  montoFinalPyg
  montoFinalUsd
  montoFinalBrl
  diferenciaPyg
  diferenciaUsd
  diferenciaBrl
  totalVentasPyg
  fechaApertura
  fechaCierre
  caja {
    id_caja
    nombre
    saldoActual
    activa
  }
  maletin {
    id_maletin
    nombre
    estado
    balancePyg
    balanceUsd
    balanceBrl
    activo
  }
}`;

@Injectable({ providedIn: 'root' })
export class SesionCajaService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);

  sesionAbierta(idCaja?: number | null): Observable<SesionCajaOutput | null> {
    const hasCaja = idCaja != null;
    const document = `query($idCaja: ID) {
      sesionCajaAbierta(idCaja: $idCaja) ${SESION_SELECTION}
    }`;
    return this.gql
      .query<{ sesionCajaAbierta: SesionCajaOutput | null }>(document, {
        idCaja: hasCaja ? idCaja : null,
      })
      .pipe(map((data) => data.sesionCajaAbierta ?? null));
  }

  abrirCaja(input: AbrirCajaInput): Observable<SesionCajaOutput> {
    const document = `mutation($input: AbrirCajaInput!) {
      abrirCaja(input: $input) ${SESION_SELECTION}
    }`;
    return this.gql
      .mutate<{ abrirCaja: SesionCajaOutput }>(document, { input })
      .pipe(
        map((data) => data.abrirCaja),
        map((sesion) => {
          this.notifications.success('Caja abierta correctamente');
          return sesion;
        })
      );
  }

  cerrarCaja(input: CerrarCajaInput): Observable<SesionCajaOutput> {
    const document = `mutation($input: CerrarCajaInput!) {
      cerrarCaja(input: $input) ${SESION_SELECTION}
    }`;
    return this.gql
      .mutate<{ cerrarCaja: SesionCajaOutput }>(document, { input })
      .pipe(
        map((data) => data.cerrarCaja),
        map((sesion) => {
          this.notifications.success('Caja cerrada correctamente');
          return sesion;
        })
      );
  }
}
