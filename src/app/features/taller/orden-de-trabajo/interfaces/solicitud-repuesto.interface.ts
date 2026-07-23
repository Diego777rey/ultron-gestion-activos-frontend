export interface SolicitudRepuestoDetalleOutput {
  id_detalle?: string | null;
  id_producto?: string | null;
  nombre_producto?: string | null;
  codigo_producto?: string | null;
  cantidad?: number | null;
}

export interface SolicitudRepuestoOutput {
  id_solicitud_repuesto?: string | null;
  id_orden_trabajo?: string | null;
  numero_orden?: string | null;
  sector_origen?: { id_sector?: string | null; nombre?: string | null } | null;
  sector_destino?: { id_sector?: string | null; nombre?: string | null } | null;
  estado?: string | null;
  observacion?: string | null;
  motivo_rechazo?: string | null;
  fecha?: string | null;
  id_transferencia?: string | null;
  numero_transferencia?: string | null;
  detalles?: SolicitudRepuestoDetalleOutput[] | null;
}

export interface SolicitudRepuestoDetalleInput {
  id_producto: string;
  cantidad: number;
}

export interface SolicitudRepuestoInput {
  id_sector_origen: string;
  observacion?: string | null;
  detalles: SolicitudRepuestoDetalleInput[];
}
