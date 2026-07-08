import { ClienteOutput } from '../../../personas/clientes/interfaces/cliente.interface';

export interface VehiculoOutput {
  id_bien?: string | null;
  tipo?: string | null;
  descripcion?: string | null;
  valor?: number | null;
  fecha_adquisicion?: string | null;
  id_empresa?: number | null;
  estado?: string | null;
  cliente?: ClienteOutput | null;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  chapa?: string | null;
  tipo_vehiculo?: string | null;
}

export interface VehiculoInput {
  id_cliente: string;
  descripcion?: string | null;
  valor?: number | null;
  fecha_adquisicion?: string | null;
  id_empresa?: number | null;
  estado?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  chapa?: string | null;
  tipo_vehiculo?: string | null;
}
