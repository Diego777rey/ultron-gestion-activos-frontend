import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CATEGORIA_SERVICIO_CRUD_CONFIG } from '../graphql/categoria-servicio.graphql';
import { CategoriaServicioOutput } from '../interfaces/servicio.interface';

export interface CategoriaServicioInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  idCategoriaPadre?: number;
}

const CATEGORIA_SELECTION = `{
  id_categoria_servicio
  nombre
  descripcion
  estado
}`;

@Injectable({ providedIn: 'root' })
export class CategoriaServicioService extends BaseCrudService<CategoriaServicioOutput, CategoriaServicioInput> {
  protected readonly config: CrudConfig = CATEGORIA_SERVICIO_CRUD_CONFIG;

  protected override resolveEntityName(entity: CategoriaServicioOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  private readonly graphql = inject(GraphqlService);

  /** Lista solo las categorias raiz (sin categoria padre). */
  findRaices(): Observable<CategoriaServicioOutput[]> {
    const op = 'listarCategoriasServicioRaiz';
    const document = `query { ${op} ${CATEGORIA_SELECTION} }`;
    return this.graphql
      .query<Record<string, CategoriaServicioOutput[]>>(document)
      .pipe(map((data) => data[op] ?? []));
  }

  /** Lista las subcategorias de una categoria padre. */
  findSubcategorias(idCategoriaPadre: number): Observable<CategoriaServicioOutput[]> {
    const op = 'listarSubcategoriasServicio';
    const document = `query($idCategoriaPadre: ID!) { ${op}(idCategoriaPadre: $idCategoriaPadre) ${CATEGORIA_SELECTION} }`;
    return this.graphql
      .query<Record<string, CategoriaServicioOutput[]>>(document, { idCategoriaPadre })
      .pipe(map((data) => data[op] ?? []));
  }
}
