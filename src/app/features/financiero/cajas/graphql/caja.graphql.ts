import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const CAJA_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'CajaInput',
  selectionSet: `{
    id_caja
    nombre
    saldoActual
    idEmpresa
    activa
    responsable {
      id_persona
      nombre
      apellido
      documento
    }
    sector {
      id_sector
      nombre
      descripcion
      estado
    }
  }`,
  operations: {
    list: 'listarCajas',
    listPaginated: 'listarCajasPaginado',
    getById: 'buscarCajaPorId',
    create: 'registrarCaja',
    update: 'actualizarCaja',
    remove: 'eliminarCaja',
  },
  entity: { label: 'Caja', gender: 'f' },
};
