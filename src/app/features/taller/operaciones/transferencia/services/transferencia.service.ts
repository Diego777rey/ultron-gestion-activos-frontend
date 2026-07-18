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

  conferir(id: number): Observable<TransferenciaOutput> {
    const document = `mutation($id: ID!) {
      conferirTransferencia(id: $id) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ conferirTransferencia: TransferenciaOutput }>(document, { id })
      .pipe(
        map((data) => data.conferirTransferencia),
        tap((t) => this.notifications.success(`Transferencia ${t.numero} conferida`))
      );
  }

  recepcionar(id: number): Observable<TransferenciaOutput> {
    const document = `mutation($id: ID!) {
      recepcionarTransferencia(id: $id) ${TRANSFERENCIA_SELECTION}
    }`;
    return this.gql
      .mutate<{ recepcionarTransferencia: TransferenciaOutput }>(document, { id })
      .pipe(
        map((data) => data.recepcionarTransferencia),
        tap((t) => this.notifications.success(`Transferencia ${t.numero} recepcionada`))
      );
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
