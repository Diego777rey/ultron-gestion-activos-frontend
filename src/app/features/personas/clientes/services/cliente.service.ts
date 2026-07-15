import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CLIENTE_CRUD_CONFIG } from '../graphql/cliente.graphql';
import { ClienteInput, ClienteOutput } from '../interfaces/cliente.interface';

/**
 * Servicio del módulo de Clientes.
 * Reutiliza toda la lógica CRUD genérica (filtrar/guardar/editar/eliminar)
 * de `BaseCrudService`, aportando únicamente la configuración GraphQL.
 */
@Injectable({ providedIn: 'root' })
export class ClienteService extends BaseCrudService<ClienteOutput, ClienteInput> {
  protected readonly config: CrudConfig = CLIENTE_CRUD_CONFIG;

  protected override resolveEntityName(entity: ClienteOutput): string | undefined {
    const nombre = `${entity.persona?.nombre ?? ''} ${entity.persona?.apellido ?? ''}`.trim();
    return nombre || undefined;
  }
}
