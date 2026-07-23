import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const ORDEN_TRABAJO_SELECTION = `{
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
  caja {
    id_caja
    nombre
    activa
  }
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
}`;

export const ORDEN_TRABAJO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'OrdenTrabajoInput',
  selectionSet: ORDEN_TRABAJO_SELECTION,
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

export const SOLICITUD_REPUESTO_SELECTION = `{
  id_solicitud_repuesto
  id_orden_trabajo
  numero_orden
  sector_origen { id_sector nombre }
  sector_destino { id_sector nombre }
  estado
  observacion
  motivo_rechazo
  fecha
  id_transferencia
  numero_transferencia
  detalles {
    id_detalle
    id_producto
    nombre_producto
    codigo_producto
    cantidad
  }
}`;
