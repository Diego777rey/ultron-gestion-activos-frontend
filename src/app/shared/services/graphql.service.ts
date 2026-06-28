import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

/** Estructura de un error GraphQL devuelto por el servidor. */
interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

/** Respuesta estándar de un endpoint GraphQL. */
interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * Servicio genérico de bajo nivel para comunicarse con el endpoint GraphQL.
 * Encapsula el transporte HTTP y el manejo uniforme de errores GraphQL.
 * Reutilizable por cualquier servicio de dominio del sistema.
 */
@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = API_CONFIG.graphqlEndpoint;

  /** Ejecuta una query GraphQL y devuelve el objeto `data` tipado. */
  query<T>(query: string, variables?: Record<string, unknown>): Observable<T> {
    return this.execute<T>(query, variables);
  }

  /** Ejecuta una mutation GraphQL y devuelve el objeto `data` tipado. */
  mutate<T>(mutation: string, variables?: Record<string, unknown>): Observable<T> {
    return this.execute<T>(mutation, variables);
  }

  private execute<T>(document: string, variables?: Record<string, unknown>): Observable<T> {
    return this.http
      .post<GraphQLResponse<T>>(this.endpoint, { query: document, variables: variables ?? {} })
      .pipe(
        map((response) => {
          if (response.errors?.length) {
            throw new Error(response.errors.map((e) => e.message).join(' | '));
          }
          return response.data as T;
        })
      );
  }
}
