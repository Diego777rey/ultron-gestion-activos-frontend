import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CATEGORIA_PRODUCTO_CRUD_CONFIG } from '../graphql/categoria-producto.graphql';
import { CategoriaProductoOutput } from '../interfaces/producto.interface';

export interface CategoriaProductoInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  idCategoriaPadre?: number;
}

@Injectable({ providedIn: 'root' })
export class CategoriaProductoService extends BaseCrudService<CategoriaProductoOutput, CategoriaProductoInput> {
  protected readonly config: CrudConfig = CATEGORIA_PRODUCTO_CRUD_CONFIG;
}
