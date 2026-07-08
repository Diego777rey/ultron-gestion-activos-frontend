import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CATEGORIA_SERVICIO_CRUD_CONFIG } from '../graphql/categoria-servicio.graphql';
import { CategoriaServicioOutput } from '../interfaces/servicio.interface';

export interface CategoriaServicioInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  idCategoriaPadre?: number;
}

@Injectable({ providedIn: 'root' })
export class CategoriaServicioService extends BaseCrudService<CategoriaServicioOutput, CategoriaServicioInput> {
  protected readonly config: CrudConfig = CATEGORIA_SERVICIO_CRUD_CONFIG;
}
