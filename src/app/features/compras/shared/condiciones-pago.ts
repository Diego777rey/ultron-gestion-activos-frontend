import { FormaPago } from '../../ventas/punto-de-venta/interfaces/venta.interface';
import { MONEDA_GUARANI, simboloMoneda } from '../../ventas/punto-de-venta/models/monedas';
import { CotizacionOutput } from '../../financiero/cotizaciones/interfaces/cotizacion.interface';

export interface OpcionFormaPago {
  codigo: FormaPago;
  label: string;
  icon: string;
}

/** Las mismas formas de pago que acepta el backend en ventas y compras. */
export const FORMAS_PAGO: readonly OpcionFormaPago[] = [
  { codigo: 'EFECTIVO', label: 'Efectivo', icon: 'payments' },
  { codigo: 'TARJETA', label: 'Tarjeta', icon: 'credit_card' },
  { codigo: 'TRANSFERENCIA', label: 'Transferencia', icon: 'account_balance' },
];

export interface MonedaCompra {
  /** Tal como se guarda: PYG o el nombre de la cotización (DOLAR, REAL…). */
  codigo: string;
  nombre: string;
  simbolo: string;
  /** Guaraníes por una unidad de la moneda. */
  cotizacion: number;
  actualizada?: string;
}

export const MONEDA_GUARANI_COMPRA: MonedaCompra = {
  codigo: MONEDA_GUARANI,
  nombre: 'Guaraní',
  simbolo: simboloMoneda(MONEDA_GUARANI),
  cotizacion: 1,
};

export function monedaDesdeCotizacion(cotizacion: CotizacionOutput): MonedaCompra {
  const nombre = cotizacion.moneda.trim();
  return {
    codigo: nombre,
    nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase(),
    simbolo: simboloMoneda(nombre),
    cotizacion: Number(cotizacion.valor),
    actualizada: cotizacion.fechaActualizacion,
  };
}
