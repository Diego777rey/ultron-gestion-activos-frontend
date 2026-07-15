import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const PRODUCTO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'ProductoInput',
  selectionSet: `{
    id_producto
    codigo
    nombre
    descripcion
    precioCompra
    precioVenta
    stock
    stockMinimo
    ubicacion
    estado
    categoriaProducto {
      id_categoria_producto
      nombre
      categoriaPadre {
        id_categoria_producto
        nombre
      }
    }
    presentaciones {
      id_presentacion_producto
      descripcion
      tipo
      cantidad
      codigoBarras
      precio
      principal
      estado
    }
  }`,
  operations: {
    list: 'listarProductos',
    listPaginated: 'listarProductosPaginado',
    getById: 'buscarProductoPorId',
    create: 'registrarProducto',
    update: 'actualizarProducto',
    remove: 'eliminarProducto',
  },
  entity: { label: 'Producto', gender: 'm' },
};
