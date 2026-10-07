import {
  buildPrueba,
  buildTicketCierreCaja,
  buildTicketFactura,
  buildTicketOrdenTrabajo,
  buildTicketOrdenTrabajoVehiculo,
  buildTicketVenta,
  envolver,
  layoutTicketOrdenTrabajo,
  layoutTicketOrdenTrabajoVehiculo,
  sanitize,
  WIDTH_58MM_FONT_B,
} from './escpos-ticket-builder';
import {
  TicketCierreCaja,
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

  describe('ticket de cierre de caja', () => {
    const cierre: TicketCierreCaja = {
      idSesionCaja: 8,
      caja: 'Caja 1',
      maletin: 'M-01',
      cajero: 'Diego Maidana',
      fechaApertura: '02/10/2026 19:08',
      fechaCierre: '07/10/2026 19:30',
      conteoApertura: [
        {
          moneda: 'PYG',
          lineas: [
            { valor: 1000, cantidad: 3, subtotal: 3000 },
            { valor: 5000, cantidad: 4, subtotal: 20000 },
          ],
          total: 23000,
        },
        { moneda: 'BRL', lineas: [], total: 0 },
        { moneda: 'USD', lineas: [], total: 0 },
      ],
      conteoCierre: [
        { moneda: 'PYG', lineas: [{ valor: 100000, cantidad: 3, subtotal: 300000 }], total: 300000 },
        { moneda: 'BRL', lineas: [{ valor: 10, cantidad: 2, subtotal: 20 }], total: 20 },
        { moneda: 'USD', lineas: [], total: 0 },
      ],
      cantidadVentas: 4,
      totalVentasPyg: 256000,
      ventasPorFormaPago: [
        { formaPago: 'EFECTIVO', cantidad: 3, total: 200000 },
        { formaPago: 'TARJETA', cantidad: 1, total: 56000 },
      ],
      retiros: [
        {
          fecha: '07/10 14:32',
          moneda: 'PYG',
          monto: 50000,
          responsable: 'Carlos Hermosilla',
          observacion: 'Deposito en el banco por pedido de la administracion central del taller',
        },
      ],
      arqueo: [
        {
          moneda: 'PYG', apertura: 23000, cobrosEfectivo: 340000, vueltos: 3000, retiros: 50000,
          esperado: 310000, contado: 300000, diferencia: -10000,
        },
        {
          moneda: 'BRL', apertura: 0, cobrosEfectivo: 20, vueltos: 0, retiros: 0,
          esperado: 20, contado: 20, diferencia: 0,
        },
        {
          moneda: 'USD', apertura: 0, cobrosEfectivo: 0, vueltos: 0, retiros: 0,
          esperado: 0, contado: 0, diferencia: 0,
        },
      ],
      idSesionAnterior: 7,
      fechaCierreAnterior: '02/10/2026 19:08',
      diferencias: [
        { moneda: 'PYG', cierreAnterior: 8000, apertura: 23000, diferencia: 15000 },
        { moneda: 'BRL', cierreAnterior: 86, apertura: 0, diferencia: -86 },
        { moneda: 'USD', cierreAnterior: 0, apertura: 0, diferencia: 0 },
      ],
    };

    it('lleva logo, conteos, ventas, diferencia y firma', () => {
      const bytes = buildTicketCierreCaja(cierre);
      const text = asText(bytes);

      expect(containsLogo(bytes)).toBe(true);
      expect(containsCut(bytes)).toBe(true);
      expect(text).toContain('CIERRE DE CAJA');
      expect(text).toContain('Sesion #8');
      expect(text).toContain('CONTEO DE APERTURA');
      expect(text).toContain('Gs. 5.000 x 4');
      expect(text).toContain('CONTEO DE CIERRE');
      expect(text).toContain('R$ 10 x 2');
      expect(text).toMatch(/Tarjeta \(1\) +56\.000/);
      expect(text).toMatch(/TOTAL VENTAS Gs\. \(4\) +256\.000/);
      expect(text).toContain('Contra cierre sesion #7');
      expect(text).toMatch(/Diferencia +\+15\.000/);
      expect(text).toMatch(/Diferencia +-86,00/);
      expect(text).toContain('FIRMA DEL CAJERO');
      expect(text).toContain('FIRMA DE CONTROL');
      expect(text.indexOf('FIRMA DEL CAJERO')).toBeGreaterThan(text.indexOf('DIFERENCIA DE APERTURA'));
    });

    it('lista los retiros con responsable y observación', () => {
      const text = asText(buildTicketCierreCaja(cierre));

      expect(text).toContain('RETIROS');
      expect(text).toMatch(/07\/10 14:32 +Gs\. 50\.000/);
      expect(text).toMatch(/Resp\. +Carlos Hermosilla/);
      expect(text).toContain('Deposito en el banco');
      expect(text).toContain('central del taller');
    });

    it('arma el arqueo con esperado, contado y faltante o sobrante', () => {
      const text = asText(buildTicketCierreCaja(cierre));
      const arqueo = text.slice(text.indexOf('ARQUEO DE CAJA'), text.indexOf('DIFERENCIA DE APERTURA'));

      expect(arqueo).toMatch(/\+ Cobros en efectivo +340\.000/);
      expect(arqueo).toMatch(/- Retiros +50\.000/);
      expect(arqueo).toMatch(/= Esperado +Gs\. 310\.000/);
      expect(arqueo).toMatch(/Contado +Gs\. 300\.000/);
      expect(arqueo).toMatch(/FALTANTE +-10\.000/);
      expect(arqueo).toContain('REALES');
      expect(arqueo).toContain('SIN DIFERENCIA');
      expect(arqueo).not.toContain('DOLARES');
    });

    it('sin retiros lo indica', () => {
      const text = asText(buildTicketCierreCaja({ ...cierre, retiros: [] }));

      expect(text).toContain('Sin retiros');
    });

    it('no pasa de 42 columnas por renglón', () => {
      const lineas = asText(buildTicketCierreCaja(cierre))
        .replace(/\x1b[aEtMd3][\s\S]/g, '')
        .split('\n')
        .filter((l) => /^[\x20-\x7E]+$/.test(l));

      expect(lineas.length).toBeGreaterThan(20);
      expect(lineas.every((l) => l.length <= WIDTH_58MM_FONT_B)).toBe(true);
    });

    it('avisa cuando el maletín no tenía cierre anterior', () => {
      const text = asText(buildTicketCierreCaja({
        ...cierre,
        idSesionAnterior: null,
        ventasPorFormaPago: [],
        cantidadVentas: 0,
        totalVentasPyg: 0,
      }));

      expect(text).toContain('Sin cierre anterior del maletin');
      expect(text).toContain('Sin ventas');
      expect(text).not.toContain('Contra cierre sesion');
    });
  });

  it('quita acentos del texto', () => {
    expect(sanitize('Gestión térmica ñ')).toBe('Gestion termica n');
  });
});
