import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import {
  PRESENTACION_PRODUCTO_CRUD_CONFIG,
  PRESENTACION_PRODUCTO_SELECTION,
} from '../graphql/presentacion-producto.graphql';
import { PresentacionProductoInput, PresentacionProductoOutput } from '../interfaces/producto.interface';

@Injectable({ providedIn: 'root' })
export class PresentacionProductoService extends BaseCrudService<PresentacionProductoOutput, PresentacionProductoInput> {
  protected readonly config: CrudConfig = PRESENTACION_PRODUCTO_CRUD_CONFIG;

  private readonly graphql = inject(GraphqlService);

  /** Lista las presentaciones de un producto especifico. */
  findByProducto(idProducto: number): Observable<PresentacionProductoOutput[]> {
    const op = 'listarPresentacionesPorProducto';
    const document = `query($idProducto: ID!) { ${op}(idProducto: $idProducto) ${PRESENTACION_PRODUCTO_SELECTION} }`;
    return this.graphql
      .query<Record<string, PresentacionProductoOutput[]>>(document, { idProducto })
      .pipe(map((data) => data[op] ?? []));
  }
}
