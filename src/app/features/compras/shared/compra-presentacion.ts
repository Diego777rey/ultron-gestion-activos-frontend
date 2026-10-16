import { CompraOutput } from '../../../shared/models/compras.model';
import { MONEDA_GUARANI, esGuarani, simboloMoneda } from '../../ventas/punto-de-venta/models/monedas';

const ESTADOS: Record<string, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  RECIBIDA: 'Recibida',
  CANCELADA: 'Cancelada',
};

export function etiquetaEstadoCompra(estado: string | null | undefined): string {
  if (!estado) {
    return '';
  }
  return ESTADOS[estado.toUpperCase()] ?? estado;
}

export function fechaCorta(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : valor;
}

/** Importe con el símbolo de la moneda del sistema (Gs., US$, R$…): sin decimales en guaraníes, dos en el resto. */
export function formatMonto(total: number | null | undefined, moneda: string | null | undefined): string {
  const decimales = esGuarani(moneda) ? 0 : 2;
  const numero = new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number(total ?? 0));
  return `${simboloMoneda(moneda || MONEDA_GUARANI)} ${numero}`;
}

export function coincideCompra(compra: CompraOutput, consulta: string): boolean {
  const texto = [
    compra.proveedor_nombre,
    compra.vendedor_nombre,
    compra.numero_factura,
    compra.moneda,
    etiquetaEstadoCompra(compra.estado),
    compra.estado,
    fechaCorta(compra.fecha_compra),
  ]
    .filter((parte) => !!parte?.trim())
    .join(' ')
    .toLowerCase();
  return texto.includes(consulta);
}
