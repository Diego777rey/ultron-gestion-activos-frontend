/**
 * Tipos del módulo de Clientes, alineados con el schema GraphQL del backend
 * (cliente.graphqls / persona.graphqls).
 */

/** Datos de salida de una persona. */
export interface PersonaOutput {
  id_persona?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  estado?: string | null;
}

/** Datos de entrada de una persona (mutations). */
export interface PersonaInput {
  nombre: string;
  apellido: string;
  documento: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  estado?: string | null;
}

/** Datos de salida de un cliente. */
export interface ClienteOutput {
  id_cliente?: string | null;
  persona?: PersonaOutput | null;
  ruc?: string | null;
  tipoCliente?: string | null;
  limiteCredito?: number | null;
  fechaRegistro?: string | null;
  observaciones?: string | null;
  estado?: boolean | null;
}

/** Datos de entrada de un cliente (mutations). */
export interface ClienteInput {
  persona: PersonaInput;
  ruc?: string | null;
  tipoCliente?: string | null;
  limiteCredito?: number | null;
  fechaRegistro?: string | null;
  observaciones?: string | null;
  estado?: boolean | null;
}
