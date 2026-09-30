import { CrudConfig } from '../../../../shared/models/crud-config.model';

const EMPRESA_FIELDS = `
  id_empresa
  razon_social
  ruc
  direccion
  fecha_creacion
  telefono
  email
  actividad_economica
  logo
  activa
`;

export const EMPRESA_CRUD_CONFIG: CrudConfig = {
  operations: {
    list: 'empresas',
    findById: 'empresa',
    create: 'registrarEmpresa',
    update: 'actualizarEmpresa',
    delete: 'eliminarEmpresa',
  },
  selectionSet: `{
    ${EMPRESA_FIELDS}
  }`,
};
