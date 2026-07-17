import { CrudConfig } from '../../../shared/models/crud-config.model';

export const ZONA_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'ZonaInput',
  selectionSet: `{
    id_zona
    nombre
    descripcion
    estado
    sector {
      id_sector
      nombre
      estado
    }
  }`,
  operations: {
    list: 'listarZonas',
    listPaginated: 'listarZonasPaginado',
    getById: 'buscarZonaPorId',
    create: 'registrarZona',
    update: 'actualizarZona',
    remove: 'eliminarZona',
  },
  entity: { label: 'Zona', gender: 'f' },
};
