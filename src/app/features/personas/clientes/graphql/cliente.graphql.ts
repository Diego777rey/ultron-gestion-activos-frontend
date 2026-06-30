import { CrudConfig } from '../../../../shared/models/crud-config.model';

/**
 * Configuración GraphQL del módulo de Clientes.
 * Define los nombres de operaciones y el conjunto de campos a recuperar.
 * Consumida por `ClienteService` (extiende `BaseCrudService`).
 */
export const CLIENTE_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'ClienteInput',
  selectionSet: `{
    id_cliente
    ruc
    tipoCliente
    limiteCredito
    fechaRegistro
    observaciones
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
    list: 'listarClientes',
    listPaginated: 'listarClientesPaginado',
    getById: 'buscarClientePorId',
    create: 'registrarCliente',
    update: 'actualizarCliente',
    remove: 'eliminarCliente',
  },
};
