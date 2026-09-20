import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PageResponse } from '../../../../shared/models/pagination.model';
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
  persona {
    id_persona
    nombre
    apellido
    documento
  }
  caja {
    id_caja
    nombre
    saldoActual
    activa
    sector {
      id_sector
      nombre
    }
  }
  maletin {
    id_maletin
    nombre
    abierto
    activo
    sector {
      id_sector
      nombre
    }
  }
}`;

const SESION_DETAIL_SELECTION = `{
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
  persona {
    id_persona
    nombre
    apellido
    documento
  }
  caja {
    id_caja
    nombre
    saldoActual
    activa
    sector {
      id_sector
      nombre
    }
  }
  maletin {
    id_maletin
    nombre
    abierto
    activo
    sector {
      id_sector
      nombre
    }
  }
  conteos {
    id_conteo
    tipo
    moneda
    valorDenominacion
    cantidad
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

  findById(id: number): Observable<SesionCajaOutput | null> {
    const document = `query($id: ID!) {
      buscarSesionCajaPorId(id: $id) ${SESION_DETAIL_SELECTION}
    }`;
    return this.gql
      .query<{ buscarSesionCajaPorId: SesionCajaOutput | null }>(document, { id })
      .pipe(map((data) => data.buscarSesionCajaPorId ?? null));
  }

  findPaginated(
    page: number,
    size: number,
    filter: string,
    idCaja: number,
    extras?: {
      estado?: string | null;
      fechaDesde?: string | null;
      fechaHasta?: string | null;
    },
  ): Observable<PageResponse<SesionCajaOutput>> {
    const document = `query(
      $page: Int!,
      $size: Int!,
      $idCaja: ID!,
      $filter: String,
      $estado: String,
      $fechaDesde: String,
      $fechaHasta: String
    ) {
      listarSesionesCajaPaginado(
        page: $page,
        size: $size,
        idCaja: $idCaja,
        filter: $filter,
        estado: $estado,
        fechaDesde: $fechaDesde,
        fechaHasta: $fechaHasta
      ) {
        content ${SESION_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    return this.gql
      .query<{ listarSesionesCajaPaginado: PageResponse<SesionCajaOutput> }>(document, {
        page,
        size,
        idCaja,
        filter: filter?.trim() || null,
        estado: extras?.estado?.trim() || null,
        fechaDesde: extras?.fechaDesde || null,
        fechaHasta: extras?.fechaHasta || null,
      })
      .pipe(map((data) => data.listarSesionesCajaPaginado));
  }
}
