import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../shared/models/crud-config.model';
import { SECTOR_CRUD_CONFIG } from '../graphql/sector.graphql';
import { SectorInput, SectorOutput } from '../interfaces/sector.interface';

@Injectable({ providedIn: 'root' })
export class SectorService extends BaseCrudService<SectorOutput, SectorInput> {
  protected readonly config: CrudConfig = SECTOR_CRUD_CONFIG;

  protected override resolveEntityName(entity: SectorOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }
}
