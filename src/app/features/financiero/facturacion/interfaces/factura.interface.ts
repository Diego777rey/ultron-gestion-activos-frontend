export interface DetalleFacturaOutput {
  descripcion?: string | null;
  cantidad?: number | null;
  precio_unitario?: number | null;
  subtotal?: number | null;
  tipo_iva?: string | null;
  monto_iva?: number | null;
}

export interface FacturaOutput {
  id_factura: number;
  numero_factura: string;
  timbrado: string;
  fecha_emision?: string | null;
  cliente_nombre?: string | null;
  cliente_documento?: string | null;
  cliente_ruc?: string | null;
  cliente_direccion?: string | null;
  total_iva_5?: number | null;
  total_iva_10?: number | null;
  total_exenta?: number | null;
  total_iva?: number | null;
  total?: number | null;
  forma_pago?: string | null;
  empresa_razon_social?: string | null;
  empresa_nombre_fantasia?: string | null;
  empresa_ruc?: string | null;
  empresa_direccion?: string | null;
  empresa_telefono?: string | null;
  empresa_actividad_economica?: string | null;
  timbrado_vigencia_inicio?: string | null;
  timbrado_vigencia_fin?: string | null;
  detalles?: DetalleFacturaOutput[] | null;
}
