import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { FacturaOutput } from '../interfaces/factura.interface';
import { LISTAR_FACTURAS_CON_VENTAS, BUSCAR_FACTURAS, OBTENER_FACTURA_POR_ID } from '../graphql/factura.graphql';

export interface FacturaPageResponse {
  content: FacturaOutput[];
  pageInfo: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private readonly gql = inject(GraphqlService);

  listarFacturasPorEmpresaYEstado(
    idEmpresa: number,
    estado: string,
    page: number,
    size: number
  ): Observable<FacturaPageResponse> {
    return this.gql
      .query<{ facturas: FacturaPageResponse }>(LISTAR_FACTURAS_CON_VENTAS, {
        page,
        size,
        idEmpresa,
        estado,
      })
      .pipe(map((data) => data.facturas));
  }

  buscarFacturas(
    idEmpresa: number,
    filtro: string,
    page: number,
    size: number
  ): Observable<FacturaPageResponse> {
    return this.gql
      .query<{ facturas: FacturaPageResponse }>(BUSCAR_FACTURAS, {
        page,
        size,
        idEmpresa,
        filtro,
      })
      .pipe(map((data) => data.facturas));
  }

  obtenerPorId(id: number): Observable<FacturaOutput> {
    return this.gql
      .query<{ factura: FacturaOutput }>(OBTENER_FACTURA_POR_ID, { id })
      .pipe(map((data) => data.factura));
  }
}
