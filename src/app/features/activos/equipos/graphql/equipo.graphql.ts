import { CrudConfig } from '../../../../shared/models/crud-config.model';

export const EQUIPO_SELECTION = `{
  id_equipo
  tipo_equipo
  marca
  modelo
  numero_serie
  descripcion
  estado
  fecha_registro
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
  }
}`;

export const EQUIPO_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'EquipoInput',
  selectionSet: EQUIPO_SELECTION,
  operations: {
    list: 'listarEquipos',
    listPaginated: 'listarEquiposPaginado',
    getById: 'buscarEquipoPorId',
    create: 'registrarEquipo',
    update: 'actualizarEquipo',
    remove: 'eliminarEquipo',
  },
  entity: { label: 'Equipo', gender: 'm' },
};
