import { ClienteOutput } from '../../../personas/clientes/interfaces/cliente.interface';
import { VehiculoOutput } from '../../vehiculos/interfaces/vehiculo.interface';

export interface EquipoOutput {
  id_equipo?: string | null;
  cliente?: ClienteOutput | null;
  vehiculo?: VehiculoOutput | null;
  tipo_equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  fecha_registro?: string | null;
}

export interface EquipoInput {
  id_cliente: string;
  id_vehiculo?: string | null;
  tipo_equipo: string;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  descripcion?: string | null;
  estado?: string | null;
}

/** Tipos sugeridos; coinciden con los componentes del ticket de orden de trabajo. */
export const TIPOS_EQUIPO = [
  'ECU', 'TABLERO', 'INMO BOX', 'BCM', 'LLAVE', 'ANTENA', 'CHIP', 'ABS',
  'MODULO AIRBAG', 'MODULO 2', 'MODULO 3',
];

export function equipoLabel(e: EquipoOutput | null | undefined): string {
  if (!e) return '';
  const nombre = [e.tipo_equipo, e.marca, e.modelo].filter(Boolean).join(' ');
  return e.numero_serie ? `${nombre} - S/N ${e.numero_serie}` : nombre;
}
