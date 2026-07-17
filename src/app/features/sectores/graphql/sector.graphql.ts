import { CrudConfig } from '../../../shared/models/crud-config.model';

export const SECTOR_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'SectorInput',
  selectionSet: `{
    id_sector
    nombre
    descripcion
    estado
  }`,
  operations: {
    list: 'listarSectores',
    listPaginated: 'listarSectoresPaginado',
    getById: 'buscarSectorPorId',
    create: 'registrarSector',
    update: 'actualizarSector',
    remove: 'eliminarSector',
  },
  entity: { label: 'Sector', gender: 'm' },
};
