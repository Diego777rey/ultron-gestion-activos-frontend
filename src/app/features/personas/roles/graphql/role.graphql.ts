import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const ROLE_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'RoleInput',
  selectionSet: `{
    id
    descripcion
    activo
  }`,
  operations: {
    list: 'listarRoles',
    listPaginated: 'listarRolesPaginado',
    getById: 'buscarRolePorId',
    create: 'registrarRole',
    update: 'actualizarRole',
    remove: 'eliminarRole',
  },
  entity: { label: 'Rol', gender: 'm' },
};
