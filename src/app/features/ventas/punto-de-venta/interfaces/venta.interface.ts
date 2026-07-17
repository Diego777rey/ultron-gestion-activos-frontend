export interface DetalleVentaInput {
  idProducto: number;
  idPresentacion?: number | null;
  cantidad: number;
  precioUnitario?: number;
}

export interface VentaInput {
  idSesionCaja: number;
  idCliente?: number | null;
  descuento?: number;
  detalles: DetalleVentaInput[];
}

export interface DetalleVentaOutput {
  id_detalle_venta?: number;
  idProducto?: number;
  productoNombre?: string;
  idPresentacion?: number;
  presentacionDescripcion?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaOutput {
  id_venta: number;
  numero: string;
  fecha?: string;
  idSesionCaja?: number;
  idCliente?: number;
  clienteNombre?: string;
  subtotal: number;
  descuento: number;
  total: number;
  estado: string;
  detalles?: DetalleVentaOutput[];
}

export interface CartItem {
  idProducto: number;
  idPresentacion?: number | null;
  nombre: string;
  presentacionLabel?: string;
  cantidad: number;
  precioUnitario: number;
  stockDisponible: number;
  factorPresentacion: number;
}
