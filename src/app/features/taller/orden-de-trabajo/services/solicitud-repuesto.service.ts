import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { SOLICITUD_REPUESTO_SELECTION } from '../graphql/orden-trabajo.graphql';
import {
  SolicitudRepuestoInput,
  SolicitudRepuestoOutput,
} from '../interfaces/solicitud-repuesto.interface';

@Injectable({ providedIn: 'root' })
export class SolicitudRepuestoService {
  private readonly gql = inject(GraphqlService);

  listarPorOrden(idOrden: string): Observable<SolicitudRepuestoOutput[]> {
    const document = `query($idOrden: ID!) {
      listarSolicitudesRepuestoPorOrden(idOrden: $idOrden) ${SOLICITUD_REPUESTO_SELECTION}
    }`;
    return this.gql
      .query<{ listarSolicitudesRepuestoPorOrden: SolicitudRepuestoOutput[] }>(document, { idOrden })
      .pipe(map((data) => data.listarSolicitudesRepuestoPorOrden ?? []));
  }

  crear(idOrden: string, input: SolicitudRepuestoInput): Observable<SolicitudRepuestoOutput> {
    const document = `mutation($idOrden: ID!, $input: SolicitudRepuestoInput!) {
      crearSolicitudRepuesto(idOrden: $idOrden, input: $input) ${SOLICITUD_REPUESTO_SELECTION}
    }`;
    return this.gql
      .mutate<{ crearSolicitudRepuesto: SolicitudRepuestoOutput }>(document, { idOrden, input })
      .pipe(map((data) => data.crearSolicitudRepuesto));
  }

  aprobar(id: string): Observable<SolicitudRepuestoOutput> {
    const document = `mutation($id: ID!) {
      aprobarSolicitudRepuesto(id: $id) ${SOLICITUD_REPUESTO_SELECTION}
    }`;
    return this.gql
      .mutate<{ aprobarSolicitudRepuesto: SolicitudRepuestoOutput }>(document, { id })
      .pipe(map((data) => data.aprobarSolicitudRepuesto));
  }

  rechazar(id: string, motivo: string): Observable<SolicitudRepuestoOutput> {
    const document = `mutation($id: ID!, $motivo: String!) {
      rechazarSolicitudRepuesto(id: $id, motivo: $motivo) ${SOLICITUD_REPUESTO_SELECTION}
    }`;
    return this.gql
      .mutate<{ rechazarSolicitudRepuesto: SolicitudRepuestoOutput }>(document, { id, motivo })
      .pipe(map((data) => data.rechazarSolicitudRepuesto));
  }
}
