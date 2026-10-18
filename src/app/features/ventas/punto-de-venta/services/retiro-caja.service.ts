import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PageResponse } from '../../../../shared/models/pagination.model';
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
  idCaja
  cajaNombre
  sectorNombre
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

  listarPaginado(
    page: number,
    size: number,
    filter: string,
    options?: {
      idCaja?: number | null;
      idSector?: number | null;
      fechaDesde?: string | null;
      fechaHasta?: string | null;
    },
  ): Observable<PageResponse<RetiroCajaOutput>> {
    const document = `query(
      $page: Int!,
      $size: Int!,
      $filter: String,
      $idCaja: ID,
      $idSector: ID,
      $fechaDesde: String,
      $fechaHasta: String
    ) {
      listarRetirosCajaPaginado(
        page: $page,
        size: $size,
        filter: $filter,
        idCaja: $idCaja,
        idSector: $idSector,
        fechaDesde: $fechaDesde,
        fechaHasta: $fechaHasta
      ) {
        content ${RETIRO_SELECTION}
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
      .query<{ listarRetirosCajaPaginado: PageResponse<RetiroCajaOutput> }>(document, {
        page,
        size,
        filter: filter || null,
        idCaja: options?.idCaja ?? null,
        idSector: options?.idSector ?? null,
        fechaDesde: options?.fechaDesde ?? null,
        fechaHasta: options?.fechaHasta ?? null,
      })
      .pipe(map((data) => data.listarRetirosCajaPaginado));
  }
}
