/** 10, 5 o EXENTA, igual que `inventario.producto.tipo_iva`. */
export type TipoIva = '10' | '5' | 'EXENTA';

export interface LineaCalculable {
  cantidad: number;
  costo: number;
  tipoIva: TipoIva;
}

export interface TotalesCompra {
  gravada10: number;
  gravada5: number;
  exenta: number;
  iva10: number;
  iva5: number;
  totalIva: number;
  total: number;
}

export function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

export function normalizarTipoIva(tipo: string | null | undefined): TipoIva {
  const valor = (tipo ?? '').trim().toUpperCase();
  return valor === '5' || valor === 'EXENTA' ? valor : '10';
}

export function subtotalLinea(linea: LineaCalculable, decimales: number): number {
  return redondear((Number(linea.cantidad) || 0) * (Number(linea.costo) || 0), decimales);
}

/** Los precios de factura incluyen IVA (IVA 10% = total / 11, IVA 5% = total / 21), como en facturación. */
export function calcularTotales(lineas: LineaCalculable[], decimales: number): TotalesCompra {
  const totales: TotalesCompra = { gravada10: 0, gravada5: 0, exenta: 0, iva10: 0, iva5: 0, totalIva: 0, total: 0 };
  for (const linea of lineas) {
    const subtotal = subtotalLinea(linea, decimales);
    if (linea.tipoIva === '10') {
      totales.gravada10 += subtotal;
      totales.iva10 += redondear(subtotal / 11, decimales);
    } else if (linea.tipoIva === '5') {
      totales.gravada5 += subtotal;
      totales.iva5 += redondear(subtotal / 21, decimales);
    } else {
      totales.exenta += subtotal;
    }
    totales.total += subtotal;
  }
  totales.totalIva = totales.iva10 + totales.iva5;
  return {
    gravada10: redondear(totales.gravada10, decimales),
    gravada5: redondear(totales.gravada5, decimales),
    exenta: redondear(totales.exenta, decimales),
    iva10: redondear(totales.iva10, decimales),
    iva5: redondear(totales.iva5, decimales),
    totalIva: redondear(totales.totalIva, decimales),
    total: redondear(totales.total, decimales),
  };
}

/** Pasa un importe de una moneda a otra usando sus cotizaciones en guaraníes. */
export function convertirImporte(importe: number, cotizacionDesde: number, cotizacionHasta: number, decimales: number): number {
  if (!cotizacionHasta || cotizacionHasta <= 0) {
    return importe;
  }
  return redondear((importe * (cotizacionDesde || 1)) / cotizacionHasta, decimales);
}
