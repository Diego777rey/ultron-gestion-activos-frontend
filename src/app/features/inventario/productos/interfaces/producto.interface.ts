export interface CategoriaProductoOutput {
  id_categoria_producto?: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  categoriaPadre?: CategoriaProductoOutput;
  /** Subcategorias cargadas bajo demanda (no viene por defecto del backend). */
  subcategorias?: CategoriaProductoOutput[];
}

export interface PresentacionProductoOutput {
  id_presentacion_producto?: number;
  descripcion: string;
  codigoBarras?: string;
  cantidad: number;
  precio: number;
}

export interface PresentacionProductoInput {
  id_presentacion_producto?: number | null;
  descripcion: string;
  codigoBarras: string;
  cantidad: number;
  precio: number;
}

export interface ProductoOutput {
  id_producto: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  codigoBarras?: string;
  precioCompra?: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  ubicacion?: string;
  estado?: boolean;
  imagen?: string;
  categoriaProducto?: CategoriaProductoOutput;
  presentaciones?: PresentacionProductoOutput[];
}

export interface ProductoInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  codigoBarras?: string;
  precioCompra?: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  ubicacion?: string;
  estado?: boolean;
  imagen?: string;
  idCategoriaProducto: number;
  presentaciones?: PresentacionProductoInput[];
}
