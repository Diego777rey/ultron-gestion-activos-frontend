import {
  buildPrueba,
  buildTicketFactura,
  buildTicketOrdenTrabajo,
  buildTicketOrdenTrabajoVehiculo,
  buildTicketVenta,
  envolver,
  layoutTicketOrdenTrabajo,
  layoutTicketOrdenTrabajoVehiculo,
  sanitize,
} from './escpos-ticket-builder';
import {
  TicketFactura,
  TicketOrdenTrabajo,
  TicketOrdenTrabajoVehiculo,
  TicketVenta,
} from '../models/impresion.model';

function asText(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

function containsCut(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0x1d && bytes[i + 1] === 0x56 && bytes[i + 2] === 0x41) {
      return true;
    }
  }
  return false;
}

function containsLogo(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length - 7; i++) {
    if (
      bytes[i] === 0x1d
      && bytes[i + 1] === 0x76
      && bytes[i + 2] === 0x30
      && bytes[i + 4] === 48
      && bytes[i + 6] === (275 & 0xff)
      && bytes[i + 7] === 1
    ) {
      return true;
    }
  }
  return false;
}

describe('escpos-ticket-builder', () => {
  it('arma la prueba con encabezado y corte', () => {
    const bytes = buildPrueba('TICKET58');
    const text = asText(bytes);

    expect(text).toContain('CH-SERVICE');
    expect(text).toContain('PRUEBA DE IMPRESION');
    expect(text).toContain('TICKET58');
    expect(containsCut(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(32);
  });

  it('arma el ticket de venta con líneas y total', () => {
    const ticket: TicketVenta = {
      titulo: 'CH-SERVICE',
      numero: 'VEN-20260921-1-0001',
      fecha: '21/09/2026 15:51',
      cajero: 'ADMIN',
      cliente: 'Consumidor final',
      lineas: [
        {
          descripcion: 'LIQUIDO DE FRENOS DOT 4',
          cantidad: 1,
          precioUnitario: 42000,
          subtotal: 42000,
        },
        {
          descripcion: 'BATERIA 12V',
          cantidad: 2,
          precioUnitario: 560000,
          subtotal: 1120000,
        },
      ],
      descuento: 0,
      total: 1162000,
      pie: 'Gracias por su compra',
    };

    const bytes = buildTicketVenta(ticket);
    const text = asText(bytes);

    expect(containsLogo(bytes)).toBe(true);
    expect(text).toContain('TICKET DE VENTA');
    expect(text).toContain('VEN-20260921-1-0001');
    expect(text).toContain('LIQUIDO DE FRENOS DOT 4');
    expect(text).toContain('BATERIA 12V');
    expect(text).toContain('1.162.000');
    expect(text).not.toContain('Recibido');
    expect(text).toContain('Gracias por su compra');
  });

  it('imprime recibido y vuelto cuando el cobro fue en efectivo con monto informado', () => {
    const ticket: TicketVenta = {
      lineas: [{ descripcion: 'FILTRO DE AIRE', cantidad: 1, precioUnitario: 566000, subtotal: 566000 }],
      total: 566000,
      montoRecibido: 600000,
      vuelto: 34000,
    };

    const text = asText(buildTicketVenta(ticket));

    expect(text).toContain('Recibido Gs.');
    expect(text).toContain('600.000');
    expect(text).toContain('Vuelto Gs.');
    expect(text).toContain('34.000');
  });

  it('imprime recibido y vuelto en otras monedas con su equivalente en guaraníes', () => {
    const ticket: TicketVenta = {
      lineas: [{ descripcion: 'FILTRO DE AIRE', cantidad: 1, precioUnitario: 566000, subtotal: 566000 }],
      total: 566000,
      montoRecibido: 100,
      monedaRecibida: 'USD',
      montoRecibidoPyg: 730000,
      vuelto: 117.14,
      monedaVuelto: 'BRL',
      vueltoPyg: 164000,
    };

    const text = asText(buildTicketVenta(ticket));

    expect(text).toContain('Recibido US$');
    expect(text).toContain('100,00');
    expect(text).toContain('730.000');
    expect(text).toContain('Vuelto R$');
    expect(text).toContain('117,14');
    expect(text).toContain('164.000');
  });

  it('arma la factura en papel con timbrado, número y liquidación de IVA', () => {
    const factura: TicketFactura = {
      razonSocial: 'DIEGO SA',
      nombreFantasia: 'TALLER DE DIEGO',
      ruc: '679878-1',
      direccion: 'DASDASD',
      telefono: '6579788',
      actividadEconomica: 'Reparacion de vehiculos',
      timbrado: '65446845',
      vigenciaInicio: '03/10/2026',
      vigenciaFin: '03/10/2036',
      numeroFactura: '001-001-0000001',
      fecha: '03/10/2026 20:52',
      condicion: 'CONTADO',
      formaPago: 'EFECTIVO',
      clienteNombre: 'SIN NOMBRE',
      clienteDocumento: null,
      clienteDireccion: null,
      lineas: [
        {
          descripcion: 'LIQUIDO DE FRENOS DOT 4',
          cantidad: 1,
          precioUnitario: 110000,
          subtotal: 110000,
          tipoIva: '10',
        },
      ],
      totalExenta: 0,
      totalGravada5: 0,
      totalGravada10: 110000,
      totalIva5: 0,
      totalIva10: 10000,
      total: 110000,
    };

    const bytes = buildTicketFactura(factura);
    const text = asText(bytes);

    expect(containsLogo(bytes)).toBe(true);
    expect(containsCut(bytes)).toBe(true);
    expect(text).toContain('DIEGO SA');
    expect(text).toContain('RUC: 679878-1');
    expect(text).toContain('TIMBRADO NRO: 65446845');
    expect(text).toContain('INICIO VIGENCIA: 03/10/2026');
    expect(text).toContain('FIN VIGENCIA: 03/10/2036');
    expect(text).toContain('FACTURA');
    expect(text).not.toContain('TICKET DE VENTA');
    expect(text).toContain('001-001-0000001');
    expect(text).toContain('CONDICION: CONTADO');
    expect(text).toContain('CLIENTE: SIN NOMBRE');
    expect(text).toContain('LIQUIDO DE FRENOS DOT 4');
    expect(text).toContain('TOTAL A PAGAR Gs.');
    expect(text).toContain('LIQUIDACION DEL IVA');
    expect(text).toContain('IVA 10%');
    expect(text).toContain('10.000');
    expect(text).toContain('ORIGINAL: CLIENTE');
    expect(text).toContain('IVA INCLUIDO');
  });

  it('arma la orden de trabajo con logo, pago de revisión y recargo urgente', () => {
    const ticket: TicketOrdenTrabajo = {
      empresa: 'CH SERVICE',
      direccion: 'Ñemby - PY',
      telefono: '0992 752 201',
      numero: 'OT-0001',
      fecha: '09/03/2026',
      hora: '10:15',
      cliente: 'Angel Armoa',
      celular: '0972 539 093',
      ruc: '3339179',
      codigoUnidad: 'XT',
      vehiculo: 'Nissan',
      vin: '',
      componentes: [{ etiqueta: 'ECU', valor: 'SI' }],
      servicios: [{ etiqueta: 'Diagnostico', valor: 'SI' }],
      serviciosOrden: ['Reparacion de ecu', 'Programacion de llaves'],
      descripcionProblema: 'Arranca pero no comunica',
      pagoRevision: 250000,
      recargoUrgente: 36,
    };

    const bytes = buildTicketOrdenTrabajo(ticket);
    const text = asText(bytes);

    expect(containsLogo(bytes)).toBe(true);
    expect(containsCut(bytes)).toBe(true);
    expect(text).toContain('\x1bM\x01');
    expect(text).toContain('ORDEN DE TRABAJO');
    expect(text).toContain('ANGEL ARMOA');
    expect(text).toContain('- REPARACION DE ECU');
    expect(text).toContain('- PROGRAMACION DE LLAVES');
    expect(text).toContain('250.000 GS.');
    expect(text).toContain('36%');
    expect(text).toContain('FIRMA DEL CLIENTE');
  });

  it('arma el ticket de vehículo con estado al ingreso, falla y servicios', () => {
    const ticket: TicketOrdenTrabajoVehiculo = {
      empresa: 'CH SERVICE',
      direccion: 'Ñemby - PY',
      telefono: '0992 752 201',
      numero: 'OT-0002',
      fecha: '05/10/2026',
      hora: '11:25',
      cliente: 'Angel Armoa',
      celular: '0972 539 093',
      ruc: '3339179',
      chapa: 'ABC123',
      vehiculo: 'Toyota Hilux 2018',
      kilometraje: '85.400 km',
      combustible: '1/2',
      tipoFalla: 'Mecánica',
      condiciones: [
        { etiqueta: 'Rayones', reparado: 'SI' },
        { etiqueta: 'Luces dañadas', reparado: 'NO' },
      ],
      observacionesEstado: '',
      servicios: ['Cambio de aceite', 'Pulido'],
      descripcionProblema: 'Ruido en el motor',
      pagoRevision: 250000,
      recargoUrgente: 36,
    };

    const bytes = buildTicketOrdenTrabajoVehiculo(ticket);
    const text = asText(bytes);

    expect(containsLogo(bytes)).toBe(true);
    expect(containsCut(bytes)).toBe(true);
    expect(text).toContain('RECEPCION DE VEHICULO');
    expect(text).toContain('ABC123');
    expect(text).toContain('MECANICA');
    expect(text).toContain('RAYONES:');
    expect(text).toContain(' REPARADO');
    expect(text).toContain('NO REPARADO');
    expect(text).toContain('- CAMBIO DE ACEITE');
    expect(text).toContain('250.000 GS.');
    expect(text).toContain('FIRMA DEL CLIENTE');
    expect(text).not.toContain('COMPONENTES');
  });

  it('imprime la misma garantía en el ticket de equipo y en el de vehículo', () => {
    const base = {
      empresa: 'CH SERVICE', direccion: '', telefono: '', numero: '', fecha: '', hora: '',
      cliente: '', celular: '', ruc: '', vehiculo: '', descripcionProblema: '',
      pagoRevision: 100000, recargoUrgente: 20,
    };
    const garantia = (renglones: ReturnType<typeof layoutTicketOrdenTrabajo>) => {
      const lineas = renglones.map((r) => ('logo' in r ? '' : r.segmentos.map((s) => s.texto).join('')));
      return lineas.slice(lineas.findIndex((l) => l.startsWith('EN CASO DE QUE EL CLIENTE')));
    };

    const equipo = layoutTicketOrdenTrabajo({ ...base, codigoUnidad: '', vin: '', componentes: [], servicios: [] });
    const vehiculo = layoutTicketOrdenTrabajoVehiculo({
      ...base, chapa: '', kilometraje: '', combustible: '', tipoFalla: '',
      condiciones: [], observacionesEstado: '', servicios: [],
    });

    expect(garantia(equipo).length).toBeGreaterThan(5);
    expect(garantia(vehiculo)).toEqual(garantia(equipo));
  });

  it('envuelve el texto a 32 columnas sin cortar palabras', () => {
    const renglones = envolver([
      { texto: 'El cliente se compromete al ' },
      { texto: 'pago de revision', negrita: true },
      { texto: '.' },
    ]);
    const lineas = renglones.map((r) => r.map((s) => s.texto).join(''));

    expect(lineas.every((l) => l.length <= 32)).toBe(true);
    expect(lineas.join(' ')).toBe('El cliente se compromete al pago de revision.');
    expect(renglones.flat().some((s) => s.negrita && s.texto.includes('revision'))).toBe(true);
  });

  it('quita acentos del texto', () => {
    expect(sanitize('Gestión térmica ñ')).toBe('Gestion termica n');
  });
});
