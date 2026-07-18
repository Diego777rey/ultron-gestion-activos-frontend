export interface PresentacionOutput {
  id_presentacion: number;
  nombre: string;
  descripcion?: string;
  cantidad?: number;
  estado?: boolean;
}

export interface PresentacionInput {
  nombre: string;
  descripcion?: string;
  cantidad?: number;
  estado?: boolean;
}
