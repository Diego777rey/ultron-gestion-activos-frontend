import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { LoadingService } from '../../../../shared/services/loading.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { TimbradoInput, TimbradoOutput } from '../interfaces/timbrado.interface';

const TIMBRADO_FIELDS = `
  id_timbrado
  numero_timbrado
  establecimiento
  punto_expedicion
  numero_inicial
  numero_final
  numero_actual
  fecha_inicio_vigencia
  fecha_fin_vigencia
  id_empresa
  tipo_factura
  activo
  fecha_creacion
  numeros_disponibles
  esta_vigente
  dias_hasta_vencimiento
`;

@Injectable({ providedIn: 'root' })
export class TimbradoService {
  private readonly gql = inject(GraphqlService);
  private readonly loading = inject(LoadingService);
  private readonly notifications = inject(NotificationService);

  listarPorEmpresa(idEmpresa: number): Observable<TimbradoOutput[]> {
    const document = `
      query($idEmpresa: ID!) {
        timbradosPorEmpresa(idEmpresa: $idEmpresa) { ${TIMBRADO_FIELDS} }
      }
    `;
    return this.gql
      .query<{ timbradosPorEmpresa: TimbradoOutput[] }>(document, { idEmpresa: String(idEmpresa) })
      .pipe(map((data) => data.timbradosPorEmpresa ?? []));
  }

  registrar(input: TimbradoInput): Observable<TimbradoOutput> {
    const document = `
      mutation($input: TimbradoInput!) {
        registrarTimbrado(input: $input) { ${TIMBRADO_FIELDS} }
      }
    `;
    return this.loading.track(
      this.gql.mutate<{ registrarTimbrado: TimbradoOutput }>(document, { input: asTimbradoVariables(input) }).pipe(
        map((data) => data.registrarTimbrado),
        tap((timbrado) =>
          this.notifications.created('Timbrado', { name: timbrado.numero_timbrado }),
        ),
      ),
      { message: 'Guardando timbrado…', errorTitle: 'No se pudo guardar el timbrado' },
    );
  }

  actualizar(id: number, input: TimbradoInput): Observable<TimbradoOutput> {
    const document = `
      mutation($id: ID!, $input: TimbradoInput!) {
        actualizarTimbrado(id: $id, input: $input) { ${TIMBRADO_FIELDS} }
      }
    `;
    return this.loading.track(
      this.gql.mutate<{ actualizarTimbrado: TimbradoOutput }>(document, {
        id: String(id),
        input: asTimbradoVariables(input),
      }).pipe(
        map((data) => data.actualizarTimbrado),
        tap((timbrado) =>
          this.notifications.updated('Timbrado', { name: timbrado.numero_timbrado }),
        ),
      ),
      { message: 'Guardando timbrado…', errorTitle: 'No se pudo guardar el timbrado' },
    );
  }

  cambiarActivo(id: number, activo: boolean): Observable<TimbradoOutput> {
    const operation = activo ? 'activarTimbrado' : 'desactivarTimbrado';
    const document = `
      mutation($id: ID!) {
        ${operation}(id: $id) { ${TIMBRADO_FIELDS} }
      }
    `;
    return this.loading.track(
      this.gql.mutate<Record<string, TimbradoOutput>>(document, { id: String(id) }).pipe(
        map((data) => data[operation]),
        tap(() =>
          this.notifications.success(
            activo ? 'El timbrado quedó activo.' : 'El timbrado quedó inactivo.',
          ),
        ),
      ),
      { message: 'Actualizando timbrado…', errorTitle: 'No se pudo actualizar el timbrado' },
    );
  }
}

function asTimbradoVariables(input: TimbradoInput): Record<string, unknown> {
  return {
    ...input,
    idEmpresa: String(input.idEmpresa),
  };
}
