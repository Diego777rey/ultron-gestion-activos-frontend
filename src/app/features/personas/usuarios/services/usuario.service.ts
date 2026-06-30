import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { USUARIO_CRUD_CONFIG } from '../graphql/usuario.graphql';
import { UsuarioInput, UsuarioOutput } from '../interfaces/usuario.interface';

@Injectable({ providedIn: 'root' })
export class UsuarioService extends BaseCrudService<UsuarioOutput, UsuarioInput> {
  protected readonly config: CrudConfig = USUARIO_CRUD_CONFIG;
}
