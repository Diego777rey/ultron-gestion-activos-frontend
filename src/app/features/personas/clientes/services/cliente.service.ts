import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CLIENTE_CRUD_CONFIG } from '../graphql/cliente.graphql';
import { ClienteInput, ClienteOutput } from '../interfaces/cliente.interface';
import { nombreCompletoPersona } from '../../shared/nombre-persona';

/**
 * Servicio del módulo de Clientes.
 * Reutiliza toda la lógica CRUD genérica (filtrar/guardar/editar/eliminar)
 * de `BaseCrudService`, aportando únicamente la configuración GraphQL.
 */
@Injectable({ providedIn: 'root' })
export class ClienteService extends BaseCrudService<ClienteOutput, ClienteInput> {
  protected readonly config: CrudConfig = CLIENTE_CRUD_CONFIG;

  /** CI o RUC, con o sin dígito verificador. Emite `null` si no es cliente. */
  buscarPorDocumento(documento: string): Observable<ClienteOutput | null> {
    const document =
      `query($documento: String!) ` +
      `{ buscarClientePorDocumento(documento: $documento) ${this.config.selectionSet} }`;
    return this.gql
      .query<{ buscarClientePorDocumento: ClienteOutput | null }>(document, { documento })
      .pipe(map((data) => data.buscarClientePorDocumento));
  }

  protected override resolveEntityName(entity: ClienteOutput): string | undefined {
    return nombreCompletoPersona(entity.persona) || undefined;
  }
}
