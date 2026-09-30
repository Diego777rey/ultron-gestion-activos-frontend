export interface EmpresaOutput {
  id_empresa: number;
  razon_social: string;
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
  ruc: string;
  direccion: string;
  fecha_creacion?: string;
  telefono?: string;
  email?: string;
  actividad_economica?: string;
  logo?: string;
  activa?: boolean;
}
