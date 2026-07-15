import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const USUARIO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'UsuarioInput',
  selectionSet: `{
    id
    username
    email
    activo
    id_funcionario
    funcionario {
      id_funcionario
      sector
      persona {
        id_persona
        nombre
        apellido
        documento
      }
    }
    roles {
      id
      descripcion
      activo
    }
  }`,
  operations: {
    list: 'listarUsuarios',
    listPaginated: 'listarUsuariosPaginado',
    getById: 'buscarUsuarioPorId',
    create: 'registrarUsuario',
    update: 'actualizarUsuario',
    remove: 'eliminarUsuario',
  },
  entity: { label: 'Usuario', gender: 'm' },
};
