import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../shared/models/crud-config.model';
import { GraphqlService } from '../../../shared/services/graphql.service';
import { ZONA_CRUD_CONFIG } from '../graphql/zona.graphql';
import { ZonaInput, ZonaOutput } from '../interfaces/zona.interface';

@Injectable({ providedIn: 'root' })
export class ZonaService extends BaseCrudService<ZonaOutput, ZonaInput> {
  protected readonly config: CrudConfig = ZONA_CRUD_CONFIG;
  private readonly graphql = inject(GraphqlService);

  protected override resolveEntityName(entity: ZonaOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  findBySector(idSector: number): Observable<ZonaOutput[]> {
    const document = `query ($idSector: ID!) {
      listarZonasPorSector(idSector: $idSector) ${this.config.selectionSet}
    }`;
    return this.graphql
      .query<{ listarZonasPorSector: ZonaOutput[] }>(document, { idSector })
      .pipe(map((data) => data.listarZonasPorSector ?? []));
  }
}
