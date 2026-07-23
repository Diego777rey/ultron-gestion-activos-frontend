import { ClienteOutput } from '../../../personas/clientes/interfaces/cliente.interface';
import { VehiculoOutput } from '../../../activos/vehiculos/interfaces/vehiculo.interface';
import { CajaOutput } from '../../../financiero/cajas/interfaces/caja.interface';

export interface OrdenTrabajoOutput {
  id_orden_trabajo?: string | null;
  numero_orden?: string | null;
  etapa?: string | null;
  cliente?: ClienteOutput | null;
  vehiculo?: VehiculoOutput | null;
  mecanico?: FuncionarioResumen | null;
  sector?: SectorResumen | null;
  responsable?: UsuarioResumen | null;
  descripcion_falla?: string | null;
  fecha_inicio_estimada?: string | null;
  fecha_fin_estimada?: string | null;
  fecha_creacion?: string | null;
  fecha_finalizacion?: string | null;
  presupuesto_aprobado?: boolean | null;
  total_presupuesto?: number | null;
  observaciones?: string | null;
  caja?: CajaOutput | null;
  detalles?: OrdenTrabajoDetalleOutput[] | null;
}

export interface OrdenTrabajoDetalleOutput {
  id_detalle?: string | null;
  tipo?: string | null;
  id_producto?: string | null;
  nombre_producto?: string | null;
  id_servicio?: string | null;
  nombre_servicio?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
  precio_unitario?: number | null;
  subtotal?: number | null;
  etapa_origen?: string | null;
}

export interface OrdenTrabajoInput {
  id_sector?: string | null;
  id_responsable?: string | null;
  id_cliente?: string | null;
  id_vehiculo?: string | null;
  id_mecanico?: string | null;
  descripcion_falla?: string | null;
  fecha_inicio_estimada?: string | null;
  fecha_fin_estimada?: string | null;
  presupuesto_aprobado?: boolean | null;
  observaciones?: string | null;
  id_caja?: string | null;
}

export interface OrdenTrabajoDetalleInput {
  tipo: string;
  id_producto?: string | null;
  id_servicio?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
  precio_unitario?: number | null;
}

export interface FuncionarioResumen {
  id_funcionario?: string | null;
  persona?: {
    nombre?: string | null;
    apellido?: string | null;
    documento?: string | null;
  } | null;
}

export interface SectorResumen {
  id_sector?: string | null;
  nombre?: string | null;
}

export interface UsuarioResumen {
  id?: string | null;
  username?: string | null;
  funcionario?: FuncionarioResumen | null;
}

export type EtapaOrdenTrabajo =
  | 'RECEPCION'
  | 'DIAGNOSTICO'
  | 'EN_PROCESO'
  | 'FINALIZADA'
  | 'FACTURADO';

export const ETAPAS_ORDEN: {
  valor: EtapaOrdenTrabajo;
  label: string;
  icono: string;
  color: string;
}[] = [
  { valor: 'RECEPCION', label: 'Recepción', icono: 'login', color: '#42A5F5' },
  { valor: 'DIAGNOSTICO', label: 'Diagnóstico', icono: 'search', color: '#FFA726' },
  { valor: 'EN_PROCESO', label: 'En Proceso', icono: 'build', color: '#AB47BC' },
  { valor: 'FINALIZADA', label: 'Finalizada', icono: 'check_circle', color: '#66BB6A' },
  { valor: 'FACTURADO', label: 'Facturado', icono: 'receipt', color: '#26A69A' },
];
