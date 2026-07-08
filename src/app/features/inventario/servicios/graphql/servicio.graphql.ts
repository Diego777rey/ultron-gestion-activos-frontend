import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const SERVICIO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'ServicioInput',
  selectionSet: `{
    id_servicio
    codigo
    nombre
    descripcion
    precio
    estado
    categoriaServicio {
      id_categoria_servicio
      nombre
    }
  }`,
  operations: {
    list: 'listarServicios',
    listPaginated: 'listarServiciosPaginado',
    getById: 'buscarServicioPorId',
    create: 'registrarServicio',
    update: 'actualizarServicio',
    remove: 'eliminarServicio',
  },
};
