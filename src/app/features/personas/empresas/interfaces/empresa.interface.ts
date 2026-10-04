export interface EmpresaOutput {
  id_empresa: number;
  razon_social: string;
  nombre_fantasia?: string;
  ruc: string;
  direccion: string;
  fecha_creacion: string;
  telefono?: string;
  email?: string;
  actividad_economica?: string;
  logo?: string;
  activa?: boolean;
}

export interface EmpresaInput {
  razon_social: string;
  nombre_fantasia?: string;
  ruc: string;
  direccion: string;
  fechaCreacion?: string;
  telefono?: string;
  email?: string;
  actividadEconomica?: string;
  logo?: string;
  activa?: boolean;
}
