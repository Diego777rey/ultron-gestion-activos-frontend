import { inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { CrudConfig } from '../models/crud-config.model';
import { LoadingQueryOption, LoadingTrackOptions } from '../models/loading.model';
import { NotificationService } from './notification.service';
import { LoadingService } from './loading.service';

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
  protected readonly loading = inject(LoadingService);

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

  /**
   * Lista todos los registros.
   * Pasá `true` (o opciones) como último argumento para mostrar el overlay al abrir la pantalla.
   */
  findAll(loading?: LoadingQueryOption): Observable<TOutput[]> {
    const op = this.config.operations.list;
    const document = `query { ${op} ${this.config.selectionSet} }`;
    return this.withPageLoading(
      this.gql.query<Record<string, TOutput[]>>(document).pipe(map((data) => data[op] ?? [])),
      loading,
    );
  }

  /**
   * Lista paginada con filtro opcional.
   * Pasá `true` como 4.º argumento en pantallas de listado; omitilo en entity-searchers.
   */
  findPaginated(
    page: number,
    size: number,
    filter?: string,
    loading?: LoadingQueryOption,
  ): Observable<import('../models/pagination.model').PageResponse<TOutput>> {
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

    const variables: Record<string, unknown> = { page, size };
    if (hasFilter) {
      variables['filter'] = filter!.trim();
    }

    return this.withPageLoading(
      this.gql
        .query<Record<string, import('../models/pagination.model').PageResponse<TOutput>>>(
          document,
          variables,
        )
        .pipe(map((data) => data[op])),
      loading,
    );
  }

  /**
   * Busca por id.
   * Pasá `true` al abrir una pantalla de detalle/edición.
   */
  findById(id: string | number, loading?: LoadingQueryOption): Observable<TOutput | null> {
    const op = this.config.operations.getById;
    const document = `query($id: ID!) { ${op}(id: $id) ${this.config.selectionSet} }`;
    return this.withPageLoading(
      this.gql
        .query<Record<string, TOutput | null>>(document, { id })
        .pipe(map((data) => data[op] ?? null)),
      loading,
    );
  }

  /** Crea un nuevo registro (overlay global + espera mínima ante error). */
  create(input: TInput): Observable<TOutput> {
    const op = this.config.operations.create;
    const document =
      `mutation($input: ${this.config.inputTypeName}!) ` +
      `{ ${op}(input: $input) ${this.config.selectionSet} }`;
    return this.loading.track(
      this.gql.mutate<Record<string, TOutput>>(document, { input }).pipe(
        map((data) => data[op]),
        tap((entity) => this.notifyCreated(entity)),
      ),
      { message: 'Guardando…', errorTitle: 'No se pudo guardar' },
    );
  }

  /** Actualiza un registro existente (overlay global + espera mínima ante error). */
  update(id: string | number, input: TInput): Observable<TOutput> {
    const op = this.config.operations.update;
    const document =
      `mutation($id: ID!, $input: ${this.config.inputTypeName}!) ` +
      `{ ${op}(id: $id, input: $input) ${this.config.selectionSet} }`;
    return this.loading.track(
      this.gql.mutate<Record<string, TOutput>>(document, { id, input }).pipe(
        map((data) => data[op]),
        tap((entity) => this.notifyUpdated(entity)),
      ),
      { message: 'Guardando…', errorTitle: 'No se pudo guardar' },
    );
  }

  /** Elimina un registro (overlay global + espera mínima ante error). */
  remove(id: string | number): Observable<boolean> {
    const op = this.config.operations.remove;
    const document = `mutation($id: ID!) { ${op}(id: $id) }`;
    return this.loading.track(
      this.gql.mutate<Record<string, boolean>>(document, { id }).pipe(
        map((data) => data[op] ?? false),
        tap((ok) => {
          if (ok) {
            this.notifyDeleted();
          }
        }),
      ),
      { message: 'Eliminando…', errorTitle: 'No se pudo eliminar' },
    );
  }

  // ==================== Loading de pantalla ====================

  /**
   * Si `loading` es true/opciones, envuelve la query con el overlay global.
   * Si se omite, la query es silenciosa (buscadores, combos, etc.).
   */
  protected withPageLoading<T>(
    source: Observable<T>,
    loading?: LoadingQueryOption,
  ): Observable<T> {
    if (!loading) {
      return source;
    }
    const defaults: LoadingTrackOptions = {
      message: 'Cargando…',
      errorTitle: 'No se pudo cargar',
    };
    const opts = typeof loading === 'boolean' ? defaults : { ...defaults, ...loading };
    return this.loading.pageLoad(source, opts);
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
}
