import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { PRESENTACION_CRUD_CONFIG } from '../graphql/presentacion.graphql';
import { PresentacionInput, PresentacionOutput } from '../interfaces/presentacion.interface';

@Injectable({ providedIn: 'root' })
export class PresentacionService extends BaseCrudService<PresentacionOutput, PresentacionInput> {
  protected readonly config: CrudConfig = PRESENTACION_CRUD_CONFIG;

  protected override resolveEntityName(entity: PresentacionOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }
}
