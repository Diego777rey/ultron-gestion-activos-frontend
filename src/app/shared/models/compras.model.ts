// ========== PROVEEDOR ==========

export enum TipoPersona {
  FISICA = 'FISICA',
  JURIDICA = 'JURIDICA'
}

export interface ProveedorOutput {
  id_proveedor: number;
  tipo_persona: TipoPersona;
  nombre?: string;
  apellido?: string;
  razon_social?: string;
  nombre_comercial?: string;
  nombre_fantasia?: string;
  ruc: string;
  documento?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  pais?: string;
  codigo_postal?: string;
  sitio_web?: string;
  observaciones?: string;
  activo: boolean;
  fecha_registro?: string;
  fecha_ultima_modificacion?: string;
  nombre_completo?: string;
}

export interface ProveedorInput {
  tipoPersona: TipoPersona;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  nombreComercial?: string;
  nombreFantasia?: string;
  ruc: string;
  documento?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  pais?: string;
  codigoPostal?: string;
  sitioWeb?: string;
  observaciones?: string;
  activo?: boolean;
}

// ========== VENDEDOR ==========

export interface VendedorOutput {
  id_vendedor: number;
  id_proveedor: number;
  proveedor_nombre?: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  celular?: string;
  cargo?: string;
  observaciones?: string;
  activo: boolean;
  fecha_registro?: string;
  fecha_ultima_modificacion?: string;
  nombre_completo?: string;
}

export interface VendedorInput {
  idProveedor: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  celular?: string;
  cargo?: string;
  observaciones?: string;
  activo?: boolean;
}

// ========== COMPRAS ==========

export interface CompraOutput {
  id_compra: number;
  id_proveedor: number;
  proveedor_nombre?: string;
  id_vendedor?: number;
  vendedor_nombre?: string;
  numero_factura?: string;
  timbrado?: string;
  fecha_factura?: string;
  fecha_compra: string;
  forma_pago: string;
  moneda: string;
  cotizacion: number;
  subtotal: number;
  total_iva: number;
  total: number;
  estado: string;
  observaciones?: string;
  fecha_registro?: string;
  fecha_ultima_modificacion?: string;
  items?: ItemCompraOutput[];
}

export interface CompraInput {
  idProveedor: number;
  idVendedor?: number;
  numeroFactura?: string;
  timbrado?: string;
  fechaFactura?: string;
  formaPago: string;
  moneda?: string;
  cotizacion?: number;
  estado?: string;
  observaciones?: string;
  items?: ItemCompraInput[];
}

export interface ItemCompraOutput {
  id_item_compra: number;
  id_compra: number;
  id_producto: number;
  producto_nombre?: string;
  producto_codigo?: string;
  cantidad: number;
  precio_costo: number;
  subtotal: number;
  tipo_iva?: string;
  iva?: number;
  fecha_vencimiento?: string;
  lote?: string;
  observaciones?: string;
  fecha_registro?: string;
}

export interface ItemCompraInput {
  idProducto: number;
  cantidad: number;
  precioCosto: number;
  tipoIva?: string;
  fechaVencimiento?: string;
  lote?: string;
  observaciones?: string;
}

export interface ProductoProveedorOutput {
  id_producto_proveedor: number;
  id_producto: number;
  producto_nombre?: string;
  producto_codigo?: string;
  id_proveedor: number;
  proveedor_nombre?: string;
  precio_ultima_compra?: number;
  fecha_ultima_compra?: string;
  observaciones?: string;
  activo: boolean;
  fecha_registro?: string;
}
