import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const COTIZACION_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'CotizacionInput',
  selectionSet: `{
    id_cotizacion
    moneda
    valor
    fechaActualizacion
    activa
  }`,
  operations: {
    list: 'listarCotizaciones',
    listPaginated: 'listarCotizacionesPaginado',
    getById: 'obtenerCotizacionPorId',
    create: 'crearCotizacion',
    update: 'actualizarCotizacion',
    remove: 'eliminarCotizacion',
  },
  entity: { label: 'Cotización', gender: 'f' },
};

export const LISTAR_COTIZACIONES_ACTIVAS = `
  query ListarCotizacionesActivas {
    listarCotizacionesActivas {
      id_cotizacion
      moneda
      valor
      fechaActualizacion
      activa
    }
  }
`;
