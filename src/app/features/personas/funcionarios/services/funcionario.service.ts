import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { FUNCIONARIO_CRUD_CONFIG } from '../graphql/funcionario.graphql';
import { FuncionarioInput, FuncionarioOutput } from '../interfaces/funcionario.interface';

/**
 * Servicio del módulo de Funcionarios.
 * Reutiliza toda la lógica CRUD genérica (filtrar/guardar/editar/eliminar)
 * de `BaseCrudService`, aportando únicamente la configuración GraphQL.
 */
@Injectable({ providedIn: 'root' })
export class FuncionarioService extends BaseCrudService<FuncionarioOutput, FuncionarioInput> {
  protected readonly config: CrudConfig = FUNCIONARIO_CRUD_CONFIG;
}
