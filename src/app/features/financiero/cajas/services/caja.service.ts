import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { CAJA_CRUD_CONFIG } from '../graphql/caja.graphql';
import { CajaInput, CajaOutput } from '../interfaces/caja.interface';

@Injectable({ providedIn: 'root' })
export class CajaService extends BaseCrudService<CajaOutput, CajaInput> {
  protected readonly config: CrudConfig = CAJA_CRUD_CONFIG;

  protected override resolveEntityName(entity: CajaOutput): string | undefined {
    return entity.nombre?.trim() || undefined;
  }

  findDisponibles(macAddress?: string | null): Observable<CajaOutput[]> {
    const document = `query($macAddress: String) {
      listarCajasDisponibles(macAddress: $macAddress) ${this.config.selectionSet}
    }`;
    return this.gql
      .query<{ listarCajasDisponibles: CajaOutput[] }>(document, {
        macAddress: macAddress?.trim() || null,
      })
      .pipe(map((data) => data.listarCajasDisponibles ?? []));
  }

  findByMac(macAddress: string): Observable<CajaOutput | null> {
    const document = `query($macAddress: String!) {
      buscarCajaPorMac(macAddress: $macAddress) ${this.config.selectionSet}
    }`;
    return this.gql
      .query<{ buscarCajaPorMac: CajaOutput | null }>(document, { macAddress })
      .pipe(map((data) => data.buscarCajaPorMac ?? null));
  }
}
