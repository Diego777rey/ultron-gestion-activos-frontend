export interface FacturaOutput {
  id_factura?: number;
  numero_factura: string;
  timbrado: string;
  fecha_emision: string;
  id_timbrado?: number;
  id_cliente?: number;
  id_venta?: number;
  id_sesion_caja?: number;
  id_empresa?: number;
  cliente_nombre: string;
  cliente_documento?: string;
  cliente_ruc?: string;
  cliente_direccion?: string;
  subtotal: number;
  total_iva_5: number;
  total_iva_10: number;
  total_exenta: number;
  total_iva: number;
  total: number;
  forma_pago: string;
  moneda: string;
  estado: string;
  fecha_anulacion?: string;
  motivo_anulacion?: string;
  id_usuario_anulacion?: number;
  observaciones?: string;
  id_usuario_emisor?: number;
  fecha_creacion: string;
  empresa_razon_social?: string;
  empresa_nombre_fantasia?: string;
  empresa_ruc?: string;
  empresa_direccion?: string;
  empresa_telefono?: string;
  empresa_actividad_economica?: string;
  timbrado_vigencia_inicio?: string;
  timbrado_vigencia_fin?: string;
}

export interface DetalleFacturaOutput {
  id_detalle_factura?: number;
  id_producto?: number;
  id_servicio?: number;
  id_presentacion?: number;
  descripcion: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  tipo_iva: string;
  monto_iva: number;
  total_linea: number;
  numero_linea: number;
}

export interface FacturaConDetallesOutput extends FacturaOutput {
  detalles: DetalleFacturaOutput[];
}
