import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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

  /** Lista los vehículos asociados a un cliente (hasta `size` registros). */
  findByCliente(idCliente: string | number, size = 100): Observable<VehiculoOutput[]> {
    const document = `query($idCliente: ID!, $page: Int!, $size: Int!) {
      listarVehiculosPorClientePaginado(idCliente: $idCliente, page: $page, size: $size) {
        content {
          id_bien
          marca
          modelo
          anio
          chapa
          tipo_vehiculo
          estado
        }
      }
    }`;
    return this.gql
      .query<{ listarVehiculosPorClientePaginado: { content: VehiculoOutput[] } }>(document, {
        idCliente,
        page: 0,
        size,
      })
      .pipe(map((data) => data.listarVehiculosPorClientePaginado?.content ?? []));
  }
}
