/**
 * Tipos del módulo de Funcionarios, alineados con el schema GraphQL del backend
 * (funcionario.graphqls / persona.graphqls).
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

/** Datos de salida de un funcionario. */
export interface FuncionarioOutput {
  id_funcionario?: string | null;
  persona?: PersonaOutput | null;
  sueldo?: number | null;
  sector?: string | null;
  fechaIngreso?: string | null;
  facePrueba?: boolean | null;
  estado?: boolean | null;
}

/** Datos de entrada de un funcionario (mutations). */
export interface FuncionarioInput {
  persona: PersonaInput;
  sueldo?: number | null;
  sector?: string | null;
  fechaIngreso?: string | null;
  facePrueba?: boolean | null;
  estado?: boolean | null;
}
