import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const CATEGORIA_PRODUCTO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'CategoriaProductoInput',
  selectionSet: `{
    id_categoria_producto
    nombre
    descripcion
    estado
  }`,
  operations: {
    list: 'listarCategoriasProducto',
    listPaginated: 'listarCategoriasProductoPaginado',
    getById: 'buscarCategoriaProductoPorId',
    create: 'registrarCategoriaProducto',
    update: 'actualizarCategoriaProducto',
    remove: 'eliminarCategoriaProducto',
  },
  entity: { label: 'Categoría de producto', gender: 'f' },
};
