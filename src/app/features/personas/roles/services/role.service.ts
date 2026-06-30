import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { ROLE_CRUD_CONFIG } from '../graphql/role.graphql';
import { RoleInput, RoleOutput } from '../interfaces/role.interface';

@Injectable({ providedIn: 'root' })
export class RoleService extends BaseCrudService<RoleOutput, RoleInput> {
  protected readonly config: CrudConfig = ROLE_CRUD_CONFIG;
}
