import { CrudConfig } from '../../../../shared/models/crud-config.model';

const COTIZACION_SELECTION = `{
  id_cotizacion
  moneda
  valor
  fechaActualizacion
  activa
}`;

export const COTIZACION_CRUD_CONFIG: CrudConfig = {
  entityName: 'cotizacion',
  entityIdField: 'id_cotizacion',
  selectionSet: COTIZACION_SELECTION,
  
  operations: {
    findPaginated: 'listarCotizacionesPaginado',
    findById: 'obtenerCotizacionPorId',
    create: 'crearCotizacion',
    update: 'actualizarCotizacion',
    delete: 'eliminarCotizacion',
  },
  
  genderFemale: true,
};
