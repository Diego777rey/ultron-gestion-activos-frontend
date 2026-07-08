import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { SERVICIO_CRUD_CONFIG } from '../graphql/servicio.graphql';
import { ServicioInput, ServicioOutput } from '../interfaces/servicio.interface';

@Injectable({ providedIn: 'root' })
export class ServicioService extends BaseCrudService<ServicioOutput, ServicioInput> {
  protected readonly config: CrudConfig = SERVICIO_CRUD_CONFIG;
}
