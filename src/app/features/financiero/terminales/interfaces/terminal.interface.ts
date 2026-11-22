export interface TerminalOutput {
  id_terminal: number;
  macAddress: string;
  hostname?: string | null;
  nombre?: string | null;
  plataforma?: string | null;
  ultimaConexion?: string | null;
  fechaRegistro?: string | null;
  activa?: boolean;
  idCaja?: number | null;
  cajaNombre?: string | null;
}

export interface RegistrarTerminalInput {
  macAddress: string;
  hostname?: string | null;
  plataforma?: string | null;
}

export interface TerminalInput {
  nombre?: string | null;
  activa?: boolean | null;
}
