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
 * Error tipado que conserva la clasificación/código enviados por el backend.
 * Mantiene `message` legible (compatible con los manejadores existentes) y
 * añade metadatos para que la capa de UI presente avisos precisos.
 */
export class GraphqlRequestError extends Error {
  /** Clasificación GraphQL del backend (ej. 'NOT_FOUND', 'BAD_REQUEST', 'INTERNAL_ERROR'). */
  readonly classification?: string;
  /** Código estable de negocio (extensión `code`), si el backend lo provee. */
  readonly code?: string;

  constructor(message: string, classification?: string, code?: string) {
    super(message);
    this.name = 'GraphqlRequestError';
    this.classification = classification;
    this.code = code;
  }
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
            const message = response.errors.map((e) => e.message).join(' | ');
            const first = response.errors[0];
            const classification = first.extensions?.['classification'] as string | undefined;
            const code = first.extensions?.['code'] as string | undefined;
            throw new GraphqlRequestError(message, classification, code);
          }
          return response.data as T;
        })
      );
  }
}
