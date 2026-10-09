import { EquipoOutput } from '../../../activos/equipos/interfaces/equipo.interface';
import { equiposDeOrden, resumenEquipos, unidadOrden } from './orden-trabajo.interface';

const vehiculo = { id_bien: '7', marca: 'Toyota', modelo: 'Vitz', chapa: 'ABC123' };
const ecu: EquipoOutput = { id_equipo: '1', tipo_equipo: 'ECU', marca: 'Toyota', numero_serie: '89661' };
const tablero: EquipoOutput = { id_equipo: '2', tipo_equipo: 'TABLERO' };

describe('equipos de la orden de trabajo', () => {
  it('ignora los equipos si la orden recepciona un vehículo', () => {
    expect(equiposDeOrden({ tipo_recepcion: 'VEHICULO', equipos: [ecu] })).toEqual([]);
    expect(equiposDeOrden({ tipo_recepcion: 'EQUIPO', equipos: [ecu, tablero] })).toEqual([ecu, tablero]);
    expect(equiposDeOrden({ tipo_recepcion: 'EQUIPO', equipos: null })).toEqual([]);
  });

  it('resume un equipo con su detalle y varios solo por tipo', () => {
    expect(resumenEquipos([ecu])).toBe('ECU Toyota - S/N 89661');
    expect(resumenEquipos([ecu, tablero])).toBe('ECU, TABLERO');
    expect(resumenEquipos([])).toBe('');
  });

  it('muestra los equipos antes del vehículo donde están montados', () => {
    expect(unidadOrden({ tipo_recepcion: 'EQUIPO', equipos: [ecu, tablero], vehiculo })).toBe(
      'ECU, TABLERO · Toyota Vitz (ABC123)',
    );
    expect(unidadOrden({ tipo_recepcion: 'VEHICULO', equipos: [ecu], vehiculo })).toBe('Toyota Vitz (ABC123)');
  });
});
