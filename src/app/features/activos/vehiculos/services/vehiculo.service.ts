import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { VEHICULO_CRUD_CONFIG } from '../graphql/vehiculo.graphql';
import { VehiculoInput, VehiculoOutput } from '../interfaces/vehiculo.interface';

@Injectable({ providedIn: 'root' })
export class VehiculoService extends BaseCrudService<VehiculoOutput, VehiculoInput> {
  protected readonly config: CrudConfig = VEHICULO_CRUD_CONFIG;

  protected override resolveEntityName(entity: VehiculoOutput): string | undefined {
    const nombre = `${entity.marca ?? ''} ${entity.modelo ?? ''}`.trim();
    const chapa = entity.chapa?.trim();
    return [nombre, chapa].filter(Boolean).join(' - ') || undefined;
  }
}
