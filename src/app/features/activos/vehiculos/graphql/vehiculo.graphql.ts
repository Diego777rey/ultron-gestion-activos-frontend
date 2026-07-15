import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const VEHICULO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'VehiculoInput',
  selectionSet: `{
    id_bien
    tipo
    descripcion
    valor
    fecha_adquisicion
    id_empresa
    estado
    marca
    modelo
    anio
    chapa
    tipo_vehiculo
    cliente {
      id_cliente
      persona {
        nombre
        apellido
        documento
      }
    }
  }`,
  operations: {
    list: 'listarVehiculos',
    listPaginated: 'listarVehiculosPaginado',
    getById: 'buscarVehiculoPorId',
    create: 'registrarVehiculo',
    update: 'actualizarVehiculo',
    remove: 'eliminarVehiculo',
  },
  entity: { label: 'Vehículo', gender: 'm' },
};
