/**
 * Configuración central de acceso al backend.
 * Punto único para cambiar el host/endpoint del API GraphQL.
 */
export const API_CONFIG = {
  /** URL base del servidor backend. */
  baseUrl: 'http://localhost:8081',
  /** Endpoint de autenticación REST. */
  authLoginEndpoint: 'http://localhost:8081/api/auth/login',
  /** Endpoint único de GraphQL expuesto por Spring GraphQL. */
  graphqlEndpoint: 'http://localhost:8081/graphql',
} as const;
