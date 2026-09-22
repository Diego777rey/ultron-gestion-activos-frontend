import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { PageResponse } from '../../../../shared/models/pagination.model';
import { VentaOutput } from '../interfaces/venta.interface';

const VENTA_SELECTION = `{
  id_venta
  numero
  fecha
  idSesionCaja
  idCliente
  clienteNombre
  subtotal
  descuento
  total
  estado
  formaPago
  detalles {
    id_detalle_venta
    idProducto
    productoNombre
    cantidad
    precioUnitario
    subtotal
  }
}`;

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly gql = inject(GraphqlService);

  findPaginated(
    page: number,
    size: number,
    filter: string,
    idSesionCaja: number,
  ): Observable<PageResponse<VentaOutput>> {
    const hasFilter = !!filter?.trim();
    const document = `query($page: Int!, $size: Int!, $idSesionCaja: ID!${hasFilter ? ', $filter: String' : ''}) {
      listarVentasPaginado(page: $page, size: $size, idSesionCaja: $idSesionCaja${hasFilter ? ', filter: $filter' : ''}) {
        content ${VENTA_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    const variables: Record<string, unknown> = { page, size, idSesionCaja };
    if (hasFilter) {
      variables['filter'] = filter.trim();
    }
    return this.gql
      .query<{ listarVentasPaginado: PageResponse<VentaOutput> }>(document, variables)
      .pipe(map((data) => data.listarVentasPaginado));
  }
}
