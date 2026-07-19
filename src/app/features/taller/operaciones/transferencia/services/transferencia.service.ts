import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { GraphqlService } from '../../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { PageResponse } from '../../../../../shared/models/pagination.model';
import {
  STOCK_SECTOR_SELECTION,
  TRANSFERENCIA_SELECTION,
} from '../graphql/transferencia.graphql';
import {
  StockProductoSectorOutput,
  TransferenciaDetalleInput,
  TransferenciaInput,
  TransferenciaOutput,
} from '../interfaces/transferencia.interface';

@Injectable({ providedIn: 'root' })
export class TransferenciaService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);

  findPaginated(page: number, size: number, filter = ''): Observable<PageResponse<TransferenciaOutput>> {
    const hasFilter = filter.trim() !== '';
    const document = `query($page: Int!, $size: Int!${hasFilter ? ', $filter: String' : ''}) {
      listarTransferenciasPaginado(page: $page, size: $size${hasFilter ? ', filter: $filter' : ''}) {
        content ${TRANSFERENCIA_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    const variables: Record<string, unknown> = { page, size };
    if (hasFilter) {
      variables['filter'] = filter.trim();
    }
    return this.gql
      .query<{ listarTransferenciasPaginado: PageResponse<TransferenciaOutput> }>(document, variables)
      .pipe(map((data) => data.listarTransferenciasPaginado));
  }

  findById(id: number): Observable<TransferenciaOutput | null> {
    const document = `query($id: ID!) {
      buscarTransferenciaPorId(id: $id) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .query<{ buscarTransferenciaPorId: TransferenciaOutput | null }>(document, { id })
      .pipe(map((data) => data.buscarTransferenciaPorId ?? null));
  }

  create(input: TransferenciaInput): Observable<TransferenciaOutput> {
    const document = `mutation($input: TransferenciaInput!) {
      registrarTransferencia(input: $input) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ registrarTransferencia: TransferenciaOutput }>(document, { input })
      .pipe(
        map((data) => data.registrarTransferencia),
        tap((t) =>
          this.notifications.success(`Transferencia ${t.numero} creada — cargá los productos`)
        )
      );
  }

  agregarProducto(
    idTransferencia: number,
    input: TransferenciaDetalleInput
  ): Observable<TransferenciaOutput> {
    const document = `mutation($idTransferencia: ID!, $input: TransferenciaDetalleInput!) {
      agregarProductoTransferencia(idTransferencia: $idTransferencia, input: $input) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ agregarProductoTransferencia: TransferenciaOutput }>(document, {
        idTransferencia,
        input,
      })
      .pipe(
        map((data) => data.agregarProductoTransferencia),
        tap(() => this.notifications.success('Producto agregado a la transferencia'))
      );
  }

  eliminarProducto(idTransferencia: number, idDetalle: number): Observable<TransferenciaOutput> {
    const document = `mutation($idTransferencia: ID!, $idDetalle: ID!) {
      eliminarProductoTransferencia(idTransferencia: $idTransferencia, idDetalle: $idDetalle) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ eliminarProductoTransferencia: TransferenciaOutput }>(document, {
        idTransferencia,
        idDetalle,
      })
      .pipe(
        map((data) => data.eliminarProductoTransferencia),
        tap(() => this.notifications.success('Producto quitado de la transferencia'))
      );
  }

  aceptarProducto(idTransferencia: number, idDetalle: number): Observable<TransferenciaOutput> {
    const document = `mutation($idTransferencia: ID!, $idDetalle: ID!) {
      aceptarProductoTransferencia(idTransferencia: $idTransferencia, idDetalle: $idDetalle) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ aceptarProductoTransferencia: TransferenciaOutput }>(document, {
        idTransferencia,
        idDetalle,
      })
      .pipe(
        map((data) => data.aceptarProductoTransferencia),
        tap(() => this.notifications.success('Producto verificado'))
      );
  }

  rechazarProducto(
    idTransferencia: number,
    idDetalle: number,
    motivo: string,
    detalle?: string
  ): Observable<TransferenciaOutput> {
    const document = `mutation($idTransferencia: ID!, $idDetalle: ID!, $motivo: String!, $detalle: String) {
      rechazarProductoTransferencia(
        idTransferencia: $idTransferencia
        idDetalle: $idDetalle
        motivo: $motivo
        detalle: $detalle
      ) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ rechazarProductoTransferencia: TransferenciaOutput }>(document, {
        idTransferencia,
        idDetalle,
        motivo,
        detalle: detalle?.trim() || null,
      })
      .pipe(
        map((data) => data.rechazarProductoTransferencia),
        tap(() => this.notifications.success('Producto rechazado — stock devuelto al origen'))
      );
  }

  avanzarEtapa(id: number): Observable<TransferenciaOutput> {
    const document = `mutation($id: ID!) {
      avanzarEtapaTransferencia(id: $id) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ avanzarEtapaTransferencia: TransferenciaOutput }>(document, { id })
      .pipe(
        map((data) => data.avanzarEtapaTransferencia),
        tap((t) => {
          const msg =
            t.estado === 'PENDIENTE_CONFERIR'
              ? `Transferencia ${t.numero}: pendiente a conferir`
              : t.estado === 'CONFERIDO'
                ? `Transferencia ${t.numero} conferida`
                : t.estado === 'RECEPCIONADO'
                  ? `Transferencia ${t.numero} recepcionada`
                  : `Transferencia ${t.numero} actualizada`;
          this.notifications.success(msg);
        })
      );
  }

  conferir(id: number): Observable<TransferenciaOutput> {
    return this.avanzarEtapa(id);
  }

  recepcionar(id: number): Observable<TransferenciaOutput> {
    return this.avanzarEtapa(id);
  }

  stockPorProductoSector(idProducto: number, idSector: number): Observable<number> {
    const document = `query($idProducto: ID!, $idSector: ID!) {
      stockPorProductoSector(idProducto: $idProducto, idSector: $idSector)
    }`;
    return this.gql
      .query<{ stockPorProductoSector: number }>(document, { idProducto, idSector })
      .pipe(map((data) => Number(data.stockPorProductoSector ?? 0)));
  }

  listarStockPorSector(
    idSector: number,
    page: number,
    size: number,
    filter = ''
  ): Observable<PageResponse<StockProductoSectorOutput>> {
    const hasFilter = filter.trim() !== '';
    const document = `query($idSector: ID!, $page: Int!, $size: Int!${hasFilter ? ', $filter: String' : ''}) {
      listarStockPorSector(idSector: $idSector, page: $page, size: $size${hasFilter ? ', filter: $filter' : ''}) {
        content ${STOCK_SECTOR_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    const variables: Record<string, unknown> = { idSector, page, size };
    if (hasFilter) {
      variables['filter'] = filter.trim();
    }
    return this.gql
      .query<{ listarStockPorSector: PageResponse<StockProductoSectorOutput> }>(document, variables)
      .pipe(map((data) => data.listarStockPorSector));
  }
}
