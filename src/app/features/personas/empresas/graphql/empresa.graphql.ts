import { CrudConfig } from '../../../../shared/models/crud-config.model';

const EMPRESA_FIELDS = `
  id_empresa
  razon_social
  nombre_fantasia
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
  inputTypeName: 'EmpresaInput',
  operations: {
    list: 'empresas',
    getById: 'empresa',
    create: 'registrarEmpresa',
    update: 'actualizarEmpresa',
    remove: 'eliminarEmpresa',
  },
  selectionSet: `{
    ${EMPRESA_FIELDS}
  }`,
  entity: {
    label: 'Empresa',
    gender: 'f',
  },
};
