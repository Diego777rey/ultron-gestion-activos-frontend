export interface PersonaResumen {
  id_persona?: number;
  nombre?: string;
  apellido?: string;
  documento?: string;
}

export interface MaletinOutput {
  id_maletin: number;
  nombre: string;
  estado: string;
  balancePyg: number;
  balanceUsd: number;
  balanceBrl: number;
  responsable?: PersonaResumen | null;
  activo?: boolean;
}

export interface MaletinInput {
  nombre: string;
  balancePyg?: number;
  balanceUsd?: number;
  balanceBrl?: number;
  idResponsable?: number | null;
  activo?: boolean;
}
