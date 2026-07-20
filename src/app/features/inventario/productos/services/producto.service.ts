import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { PRODUCTO_CRUD_CONFIG } from '../graphql/producto.graphql';
import { ProductoInput, ProductoOutput } from '../interfaces/producto.interface';

@Injectable({ providedIn: 'root' })
export class ProductoService extends BaseCrudService<ProductoOutput, ProductoInput> {
  protected readonly config: CrudConfig = PRODUCTO_CRUD_CONFIG;

  protected override resolveEntityName(entity: ProductoOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  obtenerStockPorProducto(idProducto: number): Observable<any[]> {
    const document = `query($id: ID!) { 
      listarStockPorProducto(idProducto: $id) {
        id_stock
        cantidad
        sector { id_sector nombre }
      }
    }`;
    return this.gql
      .query<Record<string, any[]>>(document, { id: idProducto })
      .pipe(map((data: Record<string, any[]>) => data['listarStockPorProducto'] ?? []));
  }
}
