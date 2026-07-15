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
  id_presentacion_producto: number;
  descripcion: string;
  tipo?: string;
  cantidad?: number;
  codigoBarras?: string;
  precio: number;
  principal?: boolean;
  estado?: boolean;
}

export interface PresentacionProductoInput {
  idProducto?: number;
  descripcion: string;
  tipo?: string;
  cantidad?: number;
  codigoBarras?: string;
  precio: number;
  principal?: boolean;
  estado?: boolean;
}

export interface ProductoOutput {
  id_producto: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioCompra?: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  ubicacion?: string;
  estado?: boolean;
  categoriaProducto?: CategoriaProductoOutput;
  presentaciones?: PresentacionProductoOutput[];
}

export interface ProductoInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioCompra?: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  ubicacion?: string;
  estado?: boolean;
  idCategoriaProducto: number;
}
