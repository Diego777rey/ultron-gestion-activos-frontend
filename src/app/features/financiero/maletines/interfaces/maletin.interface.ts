import { SectorOutput } from '../../../sectores/interfaces/sector.interface';

export interface PersonaResumen {
  id_persona?: number;
  nombre?: string;
  apellido?: string;
  documento?: string;
}

export interface MaletinOutput {
  id_maletin: number;
  nombre: string;
  abierto?: boolean;
  sector?: SectorOutput | null;
  responsable?: PersonaResumen | null;
  activo?: boolean;
  idCajaActual?: number | null;
  ultimoMovimiento?: string | null;
  ultimoResponsable?: PersonaResumen | null;
}

export interface MaletinInput {
  nombre: string;
  idSector: number;
  idResponsable?: number | null;
  activo?: boolean;
}
