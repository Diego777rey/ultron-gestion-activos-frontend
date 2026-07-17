export interface SectorOutput {
  id_sector: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

export interface SectorInput {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}
