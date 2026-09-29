import {
  buildPrueba,
  buildTicketOrdenTrabajo,
  buildTicketVenta,
  envolver,
  sanitize,
} from './escpos-ticket-builder';
import { TicketOrdenTrabajo, TicketVenta } from '../models/impresion.model';

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
    expect(text).toContain('Gracias por su compra');
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
    expect(text).toContain('250.000 GS.');
    expect(text).toContain('36%');
    expect(text).toContain('FIRMA DEL CLIENTE');
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
