import { buildPrueba, buildTicketVenta, sanitize } from './escpos-ticket-builder';
import { TicketVenta } from '../models/impresion.model';

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

  it('quita acentos del texto', () => {
    expect(sanitize('Gestión térmica ñ')).toBe('Gestion termica n');
  });
});
