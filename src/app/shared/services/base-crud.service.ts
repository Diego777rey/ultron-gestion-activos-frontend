import { inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { CrudConfig } from '../models/crud-config.model';

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

  /** Configuración GraphQL específica de la entidad. */
  protected abstract readonly config: CrudConfig;

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
      .pipe(map((data) => data[op]));
  }

  /** Actualiza un registro existente. */
  update(id: string | number, input: TInput): Observable<TOutput> {
    const op = this.config.operations.update;
    const document =
      `mutation($id: ID!, $input: ${this.config.inputTypeName}!) ` +
      `{ ${op}(id: $id, input: $input) ${this.config.selectionSet} }`;
    return this.gql
      .mutate<Record<string, TOutput>>(document, { id, input })
      .pipe(map((data) => data[op]));
  }

  /** Elimina un registro por su identificador. */
  remove(id: string | number): Observable<boolean> {
    const op = this.config.operations.remove;
    const document = `mutation($id: ID!) { ${op}(id: $id) }`;
    return this.gql
      .mutate<Record<string, boolean>>(document, { id })
      .pipe(map((data) => data[op] ?? false));
  }
}
