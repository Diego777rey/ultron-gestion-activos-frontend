import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const PRESENTACION_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'PresentacionInput',
  selectionSet: `{
    id_presentacion
    nombre
    descripcion
    cantidad
    estado
  }`,
  operations: {
    list: 'listarPresentaciones',
    listPaginated: 'listarPresentacionesPaginado',
    getById: 'buscarPresentacionPorId',
    create: 'registrarPresentacion',
    update: 'actualizarPresentacion',
    remove: 'eliminarPresentacion',
  },
  entity: { label: 'Presentación', gender: 'f' },
};
