import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { LoadingQueryOption } from '../../../../shared/models/loading.model';
import { PageResponse } from '../../../../shared/models/pagination.model';
import { ORDEN_TRABAJO_CRUD_CONFIG, ORDEN_TRABAJO_SELECTION } from '../graphql/orden-trabajo.graphql';
import {
  OrdenTrabajoOutput,
  OrdenTrabajoInput,
  OrdenTrabajoDetalleInput,
  OrdenDiagnosticoHallazgoInput,
} from '../interfaces/orden-trabajo.interface';
import { CajaOutput } from '../../../financiero/cajas/interfaces/caja.interface';

@Injectable({ providedIn: 'root' })
export class OrdenTrabajoService extends BaseCrudService<OrdenTrabajoOutput, OrdenTrabajoInput> {
  protected readonly config: CrudConfig = ORDEN_TRABAJO_CRUD_CONFIG;

  protected override resolveEntityName(entity: OrdenTrabajoOutput): string | undefined {
    return entity.numero_orden ?? undefined;
  }

  listarPaginado(
    page: number,
    size: number,
    filter = '',
    fechas?: {
      fechaDesde?: string | null;
      fechaHasta?: string | null;
    },
    loading: LoadingQueryOption = true,
  ): Observable<PageResponse<OrdenTrabajoOutput>> {
    const document = `query(
      $page: Int!,
      $size: Int!,
      $filter: String,
      $fechaDesde: String,
      $fechaHasta: String
    ) {
      listarOrdenesTrabajoPaginado(
        page: $page,
        size: $size,
        filter: $filter,
        fechaDesde: $fechaDesde,
        fechaHasta: $fechaHasta
      ) {
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
    return this.withPageLoading(
      this.gql
        .query<{ listarOrdenesTrabajoPaginado: PageResponse<OrdenTrabajoOutput> }>(document, {
          page,
          size,
          filter: filter.trim() || null,
          fechaDesde: fechas?.fechaDesde || null,
          fechaHasta: fechas?.fechaHasta || null,
        })
        .pipe(map((data) => data.listarOrdenesTrabajoPaginado)),
      loading,
    );
  }

  /** Crea la orden sin overlay ni aviso, para ir guardando la recepción. */
  crearSilencioso(input: OrdenTrabajoInput): Observable<OrdenTrabajoOutput> {
    const document = `mutation($input: OrdenTrabajoInput!) {
      crearOrdenTrabajo(input: $input) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ crearOrdenTrabajo: OrdenTrabajoOutput }>(document, { input })
      .pipe(map((data) => data.crearOrdenTrabajo));
  }

  /**
   * Actualiza la orden sin overlay ni aviso. Sirve para ir guardando
   * mientras se completan los campos.
   */
  actualizarSilencioso(id: string, input: OrdenTrabajoInput): Observable<OrdenTrabajoOutput> {
    const document = `mutation($id: ID!, $input: OrdenTrabajoInput!) {
      actualizarOrdenTrabajo(id: $id, input: $input) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ actualizarOrdenTrabajo: OrdenTrabajoOutput }>(document, { id, input })
      .pipe(map((data) => data.actualizarOrdenTrabajo));
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

  agregarHallazgo(idOrden: string, input: OrdenDiagnosticoHallazgoInput): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $input: OrdenDiagnosticoHallazgoInput!) {
      agregarHallazgoOrdenTrabajo(idOrden: $idOrden, input: $input) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ agregarHallazgoOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, input })
      .pipe(map((data) => data.agregarHallazgoOrdenTrabajo));
  }

  eliminarHallazgo(idOrden: string, idHallazgo: string): Observable<OrdenTrabajoOutput> {
    const document = `mutation($idOrden: ID!, $idHallazgo: ID!) {
      eliminarHallazgoOrdenTrabajo(idOrden: $idOrden, idHallazgo: $idHallazgo) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .mutate<{ eliminarHallazgoOrdenTrabajo: OrdenTrabajoOutput }>(document, { idOrden, idHallazgo })
      .pipe(map((data) => data.eliminarHallazgoOrdenTrabajo));
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

  findByCliente(idCliente: string, page = 0, size = 10): Observable<OrdenTrabajoOutput[]> {
    const document = `query($idCliente: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorClientePaginado(idCliente: $idCliente, page: $page, size: $size) {
        content ${ORDEN_TRABAJO_SELECTION}
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

  findByVehiculo(idVehiculo: string, page = 0, size = 10): Observable<OrdenTrabajoOutput[]> {
    const document = `query($idVehiculo: ID!, $page: Int!, $size: Int!) {
      listarOrdenesPorVehiculoPaginado(idVehiculo: $idVehiculo, page: $page, size: $size) {
        content ${ORDEN_TRABAJO_SELECTION}
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

  listarPorEtapa(etapa: string): Observable<OrdenTrabajoOutput[]> {
    const document = `query($etapa: String!) {
      listarOrdenesTrabajoPorEtapa(etapa: $etapa) ${ORDEN_TRABAJO_SELECTION}
    }`;
    return this.gql
      .query<{ listarOrdenesTrabajoPorEtapa: OrdenTrabajoOutput[] }>(document, { etapa })
      .pipe(map((data) => data.listarOrdenesTrabajoPorEtapa ?? []));
  }
}
