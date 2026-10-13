import { calcularTotales, convertirImporte, normalizarTipoIva, subtotalLinea } from './compra-calculos';

describe('compra-calculos', () => {
  it('calcula el IVA incluido en el precio, como en facturación', () => {
    const totales = calcularTotales(
      [
        { cantidad: 2, costo: 55_000, tipoIva: '10' },
        { cantidad: 1, costo: 21_000, tipoIva: '5' },
        { cantidad: 3, costo: 1_000, tipoIva: 'EXENTA' },
      ],
      0,
    );

    expect(totales.gravada10).toBe(110_000);
    expect(totales.iva10).toBe(10_000);
    expect(totales.gravada5).toBe(21_000);
    expect(totales.iva5).toBe(1_000);
    expect(totales.exenta).toBe(3_000);
    expect(totales.totalIva).toBe(11_000);
    expect(totales.total).toBe(134_000);
  });

  it('usa dos decimales en moneda extranjera', () => {
    expect(subtotalLinea({ cantidad: 3, costo: 10.335, tipoIva: '10' }, 2)).toBe(31.01);
    expect(calcularTotales([{ cantidad: 1, costo: 100, tipoIva: '10' }], 2).iva10).toBe(9.09);
  });

  it('convierte costos entre monedas con la cotización en guaraníes', () => {
    expect(convertirImporte(50_000, 1, 5_000, 2)).toBe(10);
    expect(convertirImporte(10, 5_000, 1, 0)).toBe(50_000);
    expect(convertirImporte(10, 5_000, 1_120, 2)).toBe(44.64);
  });

  it('toma IVA 10 cuando el producto no informa uno válido', () => {
    expect(normalizarTipoIva(undefined)).toBe('10');
    expect(normalizarTipoIva('exenta')).toBe('EXENTA');
    expect(normalizarTipoIva('5')).toBe('5');
    expect(normalizarTipoIva('22')).toBe('10');
  });
});
