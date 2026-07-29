import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { PageResponse } from '../../../../shared/models/pagination.model';
import { ORDEN_TRABAJO_CRUD_CONFIG, ORDEN_TRABAJO_SELECTION } from '../graphql/orden-trabajo.graphql';
import {
  OrdenTrabajoOutput,
  OrdenTrabajoInput,
  OrdenTrabajoDetalleInput,
  OrdenTrabajoDetalleOutput,
} from '../interfaces/orden-trabajo.interface';
import { CajaOutput } from '../../../financiero/cajas/interfaces/caja.interface';

const ORDEN_TRABAJO_DETALLE_SELECTION = `{
  id_detalle
  tipo
  id_producto
  nombre_producto
  id_servicio
  nombre_servicio
  descripcion
  cantidad
  precio_unitario
  subtotal
  etapa_origen
}`;

const EMPTY_PAGE_INFO = (size: number) => ({
  pageNumber: 0,
  pageSize: size,
  totalElements: 0,
  totalPages: 0,
  last: true,
});

@Injectable({ providedIn: 'root' })
export class OrdenTrabajoService extends BaseCrudService<OrdenTrabajoOutput, OrdenTrabajoInput> {
  protected readonly config: CrudConfig = ORDEN_TRABAJO_CRUD_CONFIG;

  protected override resolveEntityName(entity: OrdenTrabajoOutput): string | undefined {
    return entity.numero_orden ?? undefined;
  }

  cambiarEtapa(id: string, etapa: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($id: ID!, $etapa: String!) {
      cambiarEtapaOrdenTrabajo(id: $id, etapa: $etapa) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ cambiarEtapaOrdenTrabajo: OrdenTrabajoOutput }>(document, { id, etapa })
      .pipe(map((data) => data.cambiarEtapaOrdenTrabajo));
  }

  agregarDetalle(idOrden: string, input: OrdenTrabajoDetalleInput): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $input: OrdenTrabajoDetalleInput!) {
      agregarDetalleOrdenTrabajo(idOrden: $idOrden, input: $input) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ agregarDetalleOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, input })
      .pipe(map((data) => data.agregarDetalleOrdenTrabajo));
  }

  eliminarDetalle(idOrden: string, idDetalle: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $idDetalle: ID!) {
      eliminarDetalleOrdenTrabajo(idOrden: $idOrden, idDetalle: $idDetalle) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ eliminarDetalleOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, idDetalle })
      .pipe(map((data) => data.eliminarDetalleOrdenTrabajo));
  }

  enviarACaja(idOrden: string, idCaja: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $idCaja: ID!) {
      enviarOrdenACaja(idOrden: $idOrden, idCaja: $idCaja) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ enviarOrdenACaja: OrdenTrabajoOutput }>(document, { idOrden, idCaja })
      .pipe(map((data) => data.enviarOrdenACaja));
  }

  marcarFacturada(idOrden: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!) {
      marcarOrdenFacturada(idOrden: $idOrden) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ marcarOrdenFacturada: OrdenTrabajoOutput }>(document, { idOrden })
      .pipe(map((data) => data.marcarOrdenFacturada));
  }

  findByCliente(idCliente: string, page = 0, size = 10): Observable<PageResponse<OrdenTrabajoOutput>> {
    const document = `query($idCliente: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorClientePaginado(idCliente: $idCliente, page: $page, size: $size) {
        content ${ORDEN_TRABAJO_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    return this.gql
      .query<{ listarOrdenesPorClientePaginado: PageResponse<OrdenTrabajoOutput> }>(document, {
        idCliente,
        page,
        size,
      })
      .pipe(
        map(
          (data) =>
            data.listarOrdenesPorClientePaginado ?? {
              content: [],
              pageInfo: EMPTY_PAGE_INFO(size),
            }
        )
      );
  }

  findByVehiculo(idVehiculo: string, page = 0, size = 10): Observable<PageResponse<OrdenTrabajoOutput>> {
    const document = `query($idVehiculo: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorVehiculoPaginado(idVehiculo: $idVehiculo, page: $page, size: $size) {
        content ${ORDEN_TRABAJO_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    return this.gql
      .query<{ listarOrdenesPorVehiculoPaginado: PageResponse<OrdenTrabajoOutput> }>(document, {
        idVehiculo,
        page,
        size,
      })
      .pipe(
        map(
          (data) =>
            data.listarOrdenesPorVehiculoPaginado ?? {
              content: [],
              pageInfo: EMPTY_PAGE_INFO(size),
            }
        )
      );
  }

  findDetallesPaginado(
    idOrden: string,
    page = 0,
    size = 10
  ): Observable<PageResponse<OrdenTrabajoDetalleOutput>> {
    const document = `query($idOrden: ID!, $page: Int!, $size: Int!) {
      listarDetallesOrdenTrabajoPaginado(idOrden: $idOrden, page: $page, size: $size) {
        content ${ORDEN_TRABAJO_DETALLE_SELECTION}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    return this.gql
      .query<{ listarDetallesOrdenTrabajoPaginado: PageResponse<OrdenTrabajoDetalleOutput> }>(document, {
        idOrden,
        page,
        size,
      })
      .pipe(
        map(
          (data) =>
            data.listarDetallesOrdenTrabajoPaginado ?? {
              content: [],
              pageInfo: EMPTY_PAGE_INFO(size),
            }
        )
      );
  }

  listarAgendaMecanico(
    idMecanico: string,
    fechaDesde: string,
    fechaHasta: string
  ): Observable<OrdenTrabajoOutput[]> {
    const document = `query($idMecanico: ID!, $fechaDesde: String!, $fechaHasta: String!) {
      listarAgendaMecanico(idMecanico: $idMecanico, fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .query<{ listarAgendaMecanico: OrdenTrabajoOutput[] }>(document, {
        idMecanico,
        fechaDesde,
        fechaHasta,
      })
      .pipe(map((data) => data.listarAgendaMecanico ?? []));
  }

  listarCajasConSesionAbierta(): Observable<CajaOutput[]> {
    const document = `query {
      listarCajasConSesionAbierta {
        id_caja
        nombre
        activa
        sector { id_sector nombre }
      }
    }`;
    return this.gql
      .query<{ listarCajasConSesionAbierta: CajaOutput[] }>(document)
      .pipe(map((data) => data.listarCajasConSesionAbierta ?? []));
  }
}
