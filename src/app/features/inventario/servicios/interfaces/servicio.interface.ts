export interface CategoriaServicioOutput {
  id_categoria_servicio?: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
  categoriaPadre?: CategoriaServicioOutput;
}

export interface ServicioOutput {
  id_servicio: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  estado?: boolean;
  categoriaServicio?: CategoriaServicioOutput;
}

export interface ServicioInput {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  estado?: boolean;
  idCategoriaServicio: number;
}
