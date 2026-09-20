export interface DetalleVentaOutput {
  id_detalle_venta?: number;
  idProducto?: number;
  productoNombre?: string;
  cantidad?: number;
  precioUnitario?: number;
  subtotal?: number;
}

export interface VentaOutput {
  id_venta: number;
  numero?: string;
  fecha?: string;
  idSesionCaja?: number;
  idCliente?: number | null;
  clienteNombre?: string | null;
  subtotal?: number;
  descuento?: number;
  total?: number;
  estado?: string;
  detalles?: DetalleVentaOutput[] | null;
}
