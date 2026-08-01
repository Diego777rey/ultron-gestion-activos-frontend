export interface CategoriaProductoOutput {
  id_categoria_producto?: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  categoriaPadre?: CategoriaProductoOutput;
  /** Subcategorias cargadas bajo demanda (no viene por defecto del backend). */
  subcategorias?: CategoriaProductoOutput[];
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
  categoriaProducto?: CategoriaProductoOutput;
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
  idCategoriaProducto: number;
}
