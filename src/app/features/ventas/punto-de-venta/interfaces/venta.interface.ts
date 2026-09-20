export interface DetalleVentaInput {
  idProducto?: number | null;
  idOrdenTrabajo?: number | null;
  idServicio?: number | null;
  descripcion?: string | null;
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
  idOrdenTrabajo?: number;
  idServicio?: number;
  productoNombre?: string;
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

export type CartItemTipo = 'PRODUCTO' | 'SERVICIO' | 'ORDEN';

export interface CartItem {
  tipo: CartItemTipo;
  idProducto?: number;
  idOrdenTrabajo?: number;
  idServicio?: number;
  idCliente?: number | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  stockDisponible: number;
}
