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
  /** Query que lista todos los registros paginados. Ej: 'listarClientesPaginado'. */
  listPaginated?: string;
}

/**
 * Metadatos de la entidad usados para emitir avisos automáticos y consistentes
 * tras las operaciones CRUD (crear/actualizar/eliminar).
 *
 * Si se define en la `CrudConfig`, `BaseCrudService` mostrará un aviso de éxito
 * automáticamente. Si se omite, no se emite ningún aviso automático.
 */
export interface CrudEntityMeta {
  /** Etiqueta legible en singular. Ej: 'Cliente', 'Categoría'. */
  label: string;
  /** Género gramatical para concordar el mensaje en español. Por defecto 'm'. */
  gender?: 'm' | 'f';
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
  /**
   * Metadatos opcionales de la entidad para avisos automáticos.
   * Al definirlos, cada create/update/remove exitoso mostrará un aviso.
   */
  entity?: CrudEntityMeta;
}
