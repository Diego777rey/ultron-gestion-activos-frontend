import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const CATEGORIA_SERVICIO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'CategoriaServicioInput',
  selectionSet: `{
    id_categoria_servicio
    nombre
    descripcion
    estado
  }`,
  operations: {
    list: 'listarCategoriasServicio',
    listPaginated: 'listarCategoriasServicioPaginado',
    getById: 'buscarCategoriaServicioPorId',
    create: 'registrarCategoriaServicio',
    update: 'actualizarCategoriaServicio',
    remove: 'eliminarCategoriaServicio',
  },
};
