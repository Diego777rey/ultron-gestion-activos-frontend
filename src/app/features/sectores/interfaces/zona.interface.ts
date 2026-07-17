import { SectorOutput } from './sector.interface';

export interface ZonaOutput {
  id_zona: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  sector?: SectorOutput;
}

export interface ZonaInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  idSector: number;
}
