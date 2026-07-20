import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const ORDEN_TRABAJO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'OrdenTrabajoInput',
  selectionSet: `{
    id_orden_trabajo
    numero_orden
    etapa
    cliente {
      id_cliente
      persona {
        nombre
        apellido
        documento
      }
    }
    vehiculo {
      id_bien
      marca
      modelo
      anio
      chapa
      tipo_vehiculo
    }
    mecanico {
      id_funcionario
      persona {
        nombre
        apellido
      }
    }
    sector {
      id_sector
      nombre
    }
    responsable {
      id
      username
    }
    descripcion_falla
    fecha_inicio_estimada
    fecha_fin_estimada
    fecha_creacion
    fecha_finalizacion
    presupuesto_aprobado
    total_presupuesto
    observaciones
    detalles {
      id_detalle
      tipo
      id_producto
      nombre_producto
      id_servicio
      nombre_servicio
      descripcion
      cantidad
      precio_unitario
      subtotal
      etapa_origen
    }
  }`,
  operations: {
    list: 'listarOrdenesTrabajoPaginado',
    listPaginated: 'listarOrdenesTrabajoPaginado',
    getById: 'buscarOrdenTrabajoPorId',
    create: 'crearOrdenTrabajo',
    update: 'actualizarOrdenTrabajo',
    remove: 'eliminarOrdenTrabajo',
  },
  entity: { label: 'Orden de Trabajo', gender: 'f' },
};
