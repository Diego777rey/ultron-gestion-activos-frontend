import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const MALETIN_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'MaletinInput',
  selectionSet: `{
    id_maletin
    nombre
    estado
    balancePyg
    balanceUsd
    balanceBrl
    activo
    responsable {
      id_persona
      nombre
      apellido
      documento
    }
  }`,
  operations: {
    list: 'listarMaletines',
    listPaginated: 'listarMaletinesPaginado',
    getById: 'buscarMaletinPorId',
    create: 'registrarMaletin',
    update: 'actualizarMaletin',
    remove: 'eliminarMaletin',
  },
  entity: { label: 'Maletín', gender: 'm' },
};
