/**
 * Nombres de las operaciones GraphQL de un módulo CRUD.
 * Permiten que `BaseCrudService` construya las queries/mutations dinámicamente.
 */
export interface CrudOperations {
  /** Query que lista todos los registros. Ej: 'listarClientes'. */
  list: string;
  /** Query que busca un registro por id. Ej: 'buscarClientePorId'. */
  getById: string;
  /** Mutation de creación. Ej: 'registrarCliente'. */
  create: string;
  /** Mutation de actualización. Ej: 'actualizarCliente'. */
  update: string;
  /** Mutation de eliminación. Ej: 'eliminarCliente'. */
  remove: string;
}

/**
 * Configuración necesaria para reutilizar `BaseCrudService` en cualquier entidad.
 */
export interface CrudConfig {
  /** Nombre del tipo de entrada GraphQL para las mutations. Ej: 'ClienteInput'. */
  inputTypeName: string;
  /**
   * Conjunto de selección GraphQL (sin las llaves externas opcionales).
   * Ej: '{ id_cliente ruc persona { nombre apellido } }'.
   */
  selectionSet: string;
  /** Nombres de las operaciones GraphQL. */
  operations: CrudOperations;
}
