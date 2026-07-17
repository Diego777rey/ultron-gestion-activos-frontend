import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { MALETIN_CRUD_CONFIG } from '../graphql/maletin.graphql';
import { MaletinInput, MaletinOutput } from '../interfaces/maletin.interface';

@Injectable({ providedIn: 'root' })
export class MaletinService extends BaseCrudService<MaletinOutput, MaletinInput> {
  protected readonly config: CrudConfig = MALETIN_CRUD_CONFIG;
  private readonly graphql = inject(GraphqlService);

  protected override resolveEntityName(entity: MaletinOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  findDisponibles(): Observable<MaletinOutput[]> {
    const document = `query {
      listarMaletinesDisponibles ${this.config.selectionSet}
    }`;
    return this.graphql
      .query<{ listarMaletinesDisponibles: MaletinOutput[] }>(document)
      .pipe(map((data) => data.listarMaletinesDisponibles ?? []));
  }
}
