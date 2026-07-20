import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { ORDEN_TRABAJO_CRUD_CONFIG } from '../graphql/orden-trabajo.graphql';
import {
  OrdenTrabajoOutput,
  OrdenTrabajoInput,
  OrdenTrabajoDetalleInput,
} from '../interfaces/orden-trabajo.interface';

@Injectable({ providedIn: 'root' })
export class OrdenTrabajoService extends BaseCrudService<OrdenTrabajoOutput, OrdenTrabajoInput> {
  protected readonly config: CrudConfig = ORDEN_TRABAJO_CRUD_CONFIG;

  protected override resolveEntityName(entity: OrdenTrabajoOutput): string | undefined {
    return entity.numero_orden ?? undefined;
  }

  /** Cambia la etapa de una orden de trabajo */
  cambiarEtapa(id: string, etapa: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($id: ID!, $etapa: String!) {
      cambiarEtapaOrdenTrabajo(id: $id, etapa: $etapa) ${this.config.selectionSet}
    }`;
    return this.gql
      .mutate<{ cambiarEtapaOrdenTrabajo: OrdenTrabajoOutput }>(document, { id, etapa })
      .pipe(
        map((data) => data.cambiarEtapaOrdenTrabajo),
      );
  }

  /** Agrega un detalle (producto o servicio) a la orden */
  agregarDetalle(idOrden: string, input: OrdenTrabajoDetalleInput): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $input: OrdenTrabajoDetalleInput!) {
      agregarDetalleOrdenTrabajo(idOrden: $idOrden, input: $input) ${this.config.selectionSet}
    }`;
    return this.gql
      .mutate<{ agregarDetalleOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, input })
      .pipe(
        map((data) => data.agregarDetalleOrdenTrabajo),
      );
  }

  /** Elimina un detalle de la orden */
  eliminarDetalle(idOrden: string, idDetalle: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $idDetalle: ID!) {
      eliminarDetalleOrdenTrabajo(idOrden: $idOrden, idDetalle: $idDetalle) ${this.config.selectionSet}
    }`;
    return this.gql
      .mutate<{ eliminarDetalleOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, idDetalle })
      .pipe(
        map((data) => data.eliminarDetalleOrdenTrabajo),
      );
  }

  /** Historial de OTs por cliente */
  findByCliente(idCliente: string, page = 0, size = 10): Observable<OrdenTrabajoOutput[]> {
    const document = `query($idCliente: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorClientePaginado(idCliente: $idCliente, page: $page, size: $size) {
        content ${this.config.selectionSet}
      }
    }`;
    return this.gql
      .query<{ listarOrdenesPorClientePaginado: { content: OrdenTrabajoOutput[] } }>(document, {
        idCliente,
        page,
        size,
      })
      .pipe(map((data) => data.listarOrdenesPorClientePaginado?.content ?? []));
  }

  /** Historial de OTs por vehículo */
  findByVehiculo(idVehiculo: string, page = 0, size = 10): Observable<OrdenTrabajoOutput[]> {
    const document = `query($idVehiculo: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorVehiculoPaginado(idVehiculo: $idVehiculo, page: $page, size: $size) {
        content ${this.config.selectionSet}
      }
    }`;
    return this.gql
      .query<{ listarOrdenesPorVehiculoPaginado: { content: OrdenTrabajoOutput[] } }>(document, {
        idVehiculo,
        page,
        size,
      })
      .pipe(map((data) => data.listarOrdenesPorVehiculoPaginado?.content ?? []));
  }
}
