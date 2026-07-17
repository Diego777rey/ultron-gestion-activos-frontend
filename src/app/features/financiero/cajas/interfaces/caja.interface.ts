export interface PersonaResumen {
  id_persona?: number;
  nombre?: string;
  apellido?: string;
  documento?: string;
}

export interface CajaOutput {
  id_caja: number;
  nombre: string;
  saldoActual?: number;
  idEmpresa?: number | null;
  responsable?: PersonaResumen | null;
  activa?: boolean;
}

export interface CajaInput {
  nombre: string;
  saldoActual?: number;
  idEmpresa?: number | null;
  idResponsable?: number | null;
  activa?: boolean;
}
