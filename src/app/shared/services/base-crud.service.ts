import { inject } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { CrudConfig } from '../models/crud-config.model';
import { NotificationService } from './notification.service';

/**
 * Servicio base reutilizable para operaciones CRUD sobre GraphQL.
 *
 * Las entidades concretas (Cliente, Funcionario, etc.) extienden esta clase
 * y solo deben proveer su `config` (nombres de operaciones + selección de campos).
 * Así centralizamos los query/mutation para filtrar, guardar, editar y eliminar.
 *
 * @template TOutput Tipo de salida devuelto por las queries/mutations.
 * @template TInput  Tipo de entrada usado en las mutations de creación/edición.
 */
export abstract class BaseCrudService<TOutput, TInput> {
  protected readonly gql = inject(GraphqlService);
  protected readonly notifications = inject(NotificationService);

  /** Configuración GraphQL específica de la entidad. */
  protected abstract readonly config: CrudConfig;

  /**
   * Extrae un nombre legible del registro para enriquecer los avisos.
   * Las entidades concretas pueden sobreescribirlo (ej. `${nombre} ${apellido}`).
   * Devolver `undefined` omite el nombre en el mensaje.
   */
  protected resolveEntityName(_entity: TOutput): string | undefined {
    return undefined;
  }

  /** Lista todos los registros de la entidad. */
  findAll(): Observable<TOutput[]> {
    const op = this.config.operations.list;
    const document = `query { ${op} ${this.config.selectionSet} }`;
    return this.gql
      .query<Record<string, TOutput[]>>(document)
      .pipe(map((data) => data[op] ?? []));
  }

  /** Lista los registros de la entidad de forma paginada con filtro opcional. */
  findPaginated(page: number, size: number, filter?: string): Observable<import('../models/pagination.model').PageResponse<TOutput>> {
    const op = this.config.operations.listPaginated;
    if (!op) {
      throw new Error('listPaginated operation not defined in config');
    }
    const hasFilter = filter !== undefined && filter !== null && filter.trim() !== '';
    
    const document = `query($page: Int!, $size: Int!${hasFilter ? ', $filter: String' : ''}) { 
      ${op}(page: $page, size: $size${hasFilter ? ', filter: $filter' : ''}) {
        content ${this.config.selectionSet}
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      } 
    }`;
    
    const variables: Record<string, any> = { page, size };
    if (hasFilter) {
      variables['filter'] = filter.trim();
    }
    
    return this.gql
      .query<Record<string, import('../models/pagination.model').PageResponse<TOutput>>>(document, variables)
      .pipe(map((data) => data[op]));
  }

  /** Busca un registro por su identificador. */
  findById(id: string | number): Observable<TOutput | null> {
    const op = this.config.operations.getById;
    const document = `query($id: ID!) { ${op}(id: $id) ${this.config.selectionSet} }`;
    return this.gql
      .query<Record<string, TOutput | null>>(document, { id })
      .pipe(map((data) => data[op] ?? null));
  }

  /** Crea un nuevo registro. */
  create(input: TInput): Observable<TOutput> {
    const op = this.config.operations.create;
    const document =
      `mutation($input: ${this.config.inputTypeName}!) ` +
      `{ ${op}(input: $input) ${this.config.selectionSet} }`;
    return this.gql
      .mutate<Record<string, TOutput>>(document, { input })
      .pipe(
        map((data) => data[op]),
        tap((entity) => this.notifyCreated(entity)),
        catchError((err) => this.notifyError(err)),
      );
  }

  /** Actualiza un registro existente. */
  update(id: string | number, input: TInput): Observable<TOutput> {
    const op = this.config.operations.update;
    const document =
      `mutation($id: ID!, $input: ${this.config.inputTypeName}!) ` +
      `{ ${op}(id: $id, input: $input) ${this.config.selectionSet} }`;
    return this.gql
      .mutate<Record<string, TOutput>>(document, { id, input })
      .pipe(
        map((data) => data[op]),
        tap((entity) => this.notifyUpdated(entity)),
        catchError((err) => this.notifyError(err)),
      );
  }

  /** Elimina un registro por su identificador. */
  remove(id: string | number): Observable<boolean> {
    const op = this.config.operations.remove;
    const document = `mutation($id: ID!) { ${op}(id: $id) }`;
    return this.gql
      .mutate<Record<string, boolean>>(document, { id })
      .pipe(
        map((data) => data[op] ?? false),
        tap((ok) => {
          if (ok) {
            this.notifyDeleted();
          }
        }),
        catchError((err) => this.notifyError(err)),
      );
  }

  // ==================== Avisos automáticos ====================

  private notifyCreated(entity: TOutput): void {
    const meta = this.config.entity;
    if (!meta) return;
    this.notifications.created(meta.label, {
      gender: meta.gender,
      name: this.resolveEntityName(entity),
    });
  }

  private notifyUpdated(entity: TOutput): void {
    const meta = this.config.entity;
    if (!meta) return;
    this.notifications.updated(meta.label, {
      gender: meta.gender,
      name: this.resolveEntityName(entity),
    });
  }

  private notifyDeleted(): void {
    const meta = this.config.entity;
    if (!meta) return;
    this.notifications.deleted(meta.label, { gender: meta.gender });
  }

  /**
   * Muestra un aviso de error (rojo) y re-lanza el error para que la lógica
   * del componente (por ejemplo, el mensaje en línea del formulario) siga operando.
   */
  private notifyError(err: unknown): Observable<never> {
    const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
    this.notifications.error(message);
    return throwError(() => err);
  }
}
