import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CAJA_CRUD_CONFIG } from '../graphql/caja.graphql';
import { CajaInput, CajaOutput } from '../interfaces/caja.interface';

@Injectable({ providedIn: 'root' })
export class CajaService extends BaseCrudService<CajaOutput, CajaInput> {
  protected readonly config: CrudConfig = CAJA_CRUD_CONFIG;

  protected override resolveEntityName(entity: CajaOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  findDisponibles(): Observable<CajaOutput[]> {
    const document = `query { listarCajasDisponibles ${this.config.selectionSet} }`;
    return this.gql
      .query<{ listarCajasDisponibles: CajaOutput[] }>(document)
      .pipe(map((data) => data.listarCajasDisponibles ?? []));
  }
}
