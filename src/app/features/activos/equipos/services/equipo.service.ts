import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { EQUIPO_CRUD_CONFIG, EQUIPO_SELECTION } from '../graphql/equipo.graphql';
import { EquipoInput, EquipoOutput, equipoLabel } from '../interfaces/equipo.interface';

@Injectable({ providedIn: 'root' })
export class EquipoService extends BaseCrudService<EquipoOutput, EquipoInput> {
  protected readonly config: CrudConfig = EQUIPO_CRUD_CONFIG;

  protected override resolveEntityName(entity: EquipoOutput): string | undefined {
    return equipoLabel(entity) || undefined;
  }

  /** Lista los equipos de un cliente (hasta `size` registros). */
  findByCliente(idCliente: string | number, size = 100, filter = ''): Observable<EquipoOutput[]> {
    const document = `query($idCliente: ID!, $page: Int!, $size: Int!, $filter: String) {
      listarEquiposPorClientePaginado(idCliente: $idCliente, page: $page, size: $size, filter: $filter) {
        content ${EQUIPO_SELECTION}
      }
    }`;
    return this.gql
      .query<{ listarEquiposPorClientePaginado: { content: EquipoOutput[] } }>(document, {
        idCliente,
        page: 0,
        size,
        filter: filter || null,
      })
      .pipe(map((data) => data.listarEquiposPorClientePaginado?.content ?? []));
  }
}
