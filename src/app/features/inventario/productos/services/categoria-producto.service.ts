import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CATEGORIA_PRODUCTO_CRUD_CONFIG } from '../graphql/categoria-producto.graphql';
import { CategoriaProductoOutput } from '../interfaces/producto.interface';

export interface CategoriaProductoInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  idCategoriaPadre?: number;
}

const CATEGORIA_SELECTION = `{
  id_categoria_producto
  nombre
  descripcion
  estado
}`;

@Injectable({ providedIn: 'root' })
export class CategoriaProductoService extends BaseCrudService<CategoriaProductoOutput, CategoriaProductoInput> {
  protected readonly config: CrudConfig = CATEGORIA_PRODUCTO_CRUD_CONFIG;

  private readonly graphql = inject(GraphqlService);

  /** Lista solo las categorias raiz (sin categoria padre). */
  findRaices(): Observable<CategoriaProductoOutput[]> {
    const op = 'listarCategoriasProductoRaiz';
    const document = `query { ${op} ${CATEGORIA_SELECTION} }`;
    return this.graphql
      .query<Record<string, CategoriaProductoOutput[]>>(document)
      .pipe(map((data) => data[op] ?? []));
  }

  /** Lista las subcategorias de una categoria padre. */
  findSubcategorias(idCategoriaPadre: number): Observable<CategoriaProductoOutput[]> {
    const op = 'listarSubcategoriasProducto';
    const document = `query($idCategoriaPadre: ID!) { ${op}(idCategoriaPadre: $idCategoriaPadre) ${CATEGORIA_SELECTION} }`;
    return this.graphql
      .query<Record<string, CategoriaProductoOutput[]>>(document, { idCategoriaPadre })
      .pipe(map((data) => data[op] ?? []));
  }
}
