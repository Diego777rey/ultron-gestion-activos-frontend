import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const PRESENTACION_PRODUCTO_SELECTION = `{
  id_presentacion_producto
  descripcion
  tipo
  cantidad
  codigoBarras
  precio
  principal
  estado
}`;

export const PRESENTACION_PRODUCTO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'PresentacionProductoInput',
  selectionSet: PRESENTACION_PRODUCTO_SELECTION,
  operations: {
    list: 'listarPresentacionesPorProducto',
    getById: 'buscarPresentacionProductoPorId',
    create: 'registrarPresentacionProducto',
    update: 'actualizarPresentacionProducto',
    remove: 'eliminarPresentacionProducto',
  },
};
