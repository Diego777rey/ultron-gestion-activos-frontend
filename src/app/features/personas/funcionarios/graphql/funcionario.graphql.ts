import { CrudConfig } from '../../../../shared/models/crud-config.model';

/**
 * Configuración GraphQL del módulo de Funcionarios.
 * Define los nombres de operaciones y el conjunto de campos a recuperar.
 * Consumida por `FuncionarioService` (extiende `BaseCrudService`).
 */
export const FUNCIONARIO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'FuncionarioInput',
  selectionSet: `{
    id_funcionario
    sueldo
    sector
    fechaIngreso
    facePrueba
    estado
    persona {
      id_persona
      nombre
      apellido
      documento
      email
      telefono
      direccion
      estado
    }
  }`,
  operations: {
    list: 'listarFuncionarios',
    listPaginated: 'listarFuncionariosPaginado',
    getById: 'buscarFuncionarioPorId',
    create: 'registrarFuncionario',
    update: 'actualizarFuncionario',
    remove: 'eliminarFuncionario',
  },
};
