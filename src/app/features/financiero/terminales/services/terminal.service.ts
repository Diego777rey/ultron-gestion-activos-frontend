import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PageResponse } from '../../../../shared/models/pagination.model';
import {
  RegistrarTerminalInput,
  TerminalInput,
  TerminalOutput,
} from '../interfaces/terminal.interface';

const TERMINAL_SELECTION = `{
  id_terminal
  macAddress
  hostname
  nombre
  plataforma
  ultimaConexion
  fechaRegistro
  activa
  idCaja
  cajaNombre
}`;

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);

  /** Upsert silencioso: lo llama la app Electron al iniciar. */
  registrar(input: RegistrarTerminalInput): Observable<TerminalOutput> {
    const document = `mutation($input: RegistrarTerminalInput!) {
      registrarTerminal(input: $input) ${TERMINAL_SELECTION}
    }`;
    return this.gql
      .mutate<{ registrarTerminal: TerminalOutput }>(document, { input })
      .pipe(map((data) => data.registrarTerminal));
  }

  findPaginated(page: number, size: number, filter = ''): Observable<PageResponse<TerminalOutput>> {
    const document = `query($page: Int!, $size: Int!, $filter: String) {
      listarTerminalesPaginado(page: $page, size: $size, filter: $filter) {
        content ${TERMINAL_SELECTION}
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
      .query<{ listarTerminalesPaginado: PageResponse<TerminalOutput> }>(document, {
        page,
        size,
        filter: filter?.trim() || null,
      })
      .pipe(map((data) => data.listarTerminalesPaginado));
  }

  findByMac(macAddress: string): Observable<TerminalOutput | null> {
    const document = `query($macAddress: String!) {
      buscarTerminalPorMac(macAddress: $macAddress) ${TERMINAL_SELECTION}
    }`;
    return this.gql
      .query<{ buscarTerminalPorMac: TerminalOutput | null }>(document, { macAddress })
      .pipe(map((data) => data.buscarTerminalPorMac ?? null));
  }

  actualizar(id: number, input: TerminalInput): Observable<TerminalOutput> {
    const document = `mutation($id: ID!, $input: TerminalInput!) {
      actualizarTerminal(id: $id, input: $input) ${TERMINAL_SELECTION}
    }`;
    return this.gql
      .mutate<{ actualizarTerminal: TerminalOutput }>(document, { id, input })
      .pipe(
        map((data) => data.actualizarTerminal),
        map((terminal) => {
          this.notifications.success('Terminal actualizada');
          return terminal;
        }),
      );
  }

  asignarCaja(idTerminal: number, idCaja: number): Observable<TerminalOutput> {
    const document = `mutation($idTerminal: ID!, $idCaja: ID!) {
      asignarCajaATerminal(idTerminal: $idTerminal, idCaja: $idCaja) ${TERMINAL_SELECTION}
    }`;
    return this.gql
      .mutate<{ asignarCajaATerminal: TerminalOutput }>(document, { idTerminal, idCaja })
      .pipe(
        map((data) => data.asignarCajaATerminal),
        map((terminal) => {
          this.notifications.success(
            terminal.cajaNombre
              ? `Caja ${terminal.cajaNombre} habilitada en esta terminal`
              : 'Caja asignada a la terminal',
          );
          return terminal;
        }),
      );
  }

  desasignarCaja(idTerminal: number): Observable<TerminalOutput> {
    const document = `mutation($idTerminal: ID!) {
      desasignarCajaDeTerminal(idTerminal: $idTerminal) ${TERMINAL_SELECTION}
    }`;
    return this.gql
      .mutate<{ desasignarCajaDeTerminal: TerminalOutput }>(document, { idTerminal })
      .pipe(
        map((data) => data.desasignarCajaDeTerminal),
        map((terminal) => {
          this.notifications.success('Caja desvinculada de la terminal');
          return terminal;
        }),
      );
  }
}
