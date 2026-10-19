import { buildTicketVenta } from '../../../shared/printing/escpos-ticket-builder';
import { lineasTicketVenta } from './ticket-venta-lineas';

function texto(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

describe('lineasTicketVenta', () => {
  it('imprime cada servicio de la orden como un producto', () => {
    const lineas = lineasTicketVenta([
      {
        productoNombre: 'OT-0016 · 6DSADAD',
        cantidad: 1,
        precioUnitario: 198000,
        subtotal: 198000,
        lineasOrden: [
          { descripcion: 'OT-0016 - CAMBIO DE ACEITE', cantidad: 1, precioUnitario: 150000, subtotal: 150000 },
          { descripcion: 'OT-0016 - FILTRO', cantidad: 2, precioUnitario: 24000, subtotal: 48000 },
        ],
      },
    ]);

    const ticket = texto(buildTicketVenta({ lineas, total: 198000 }));

    expect(ticket).toContain('OT-0016 - CAMBIO DE ACEITE');
    expect(ticket).toContain('OT-0016 - FILTRO');
    expect(ticket).not.toContain('6DSADAD');
    expect(ticket).toContain('150.000');
    expect(ticket).toContain('48.000');
  });

  it('deja el producto suelto en una sola línea', () => {
    const lineas = lineasTicketVenta([
      { productoNombre: 'FILTRO DE AIRE', cantidad: 1, precioUnitario: 566000, subtotal: 566000 },
    ]);

    expect(lineas).toEqual([
      { descripcion: 'FILTRO DE AIRE', cantidad: 1, precioUnitario: 566000, subtotal: 566000 },
    ]);
  });
});
