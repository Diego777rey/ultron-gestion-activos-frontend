import { CompraOutput } from '../../../shared/models/compras.model';

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

export function formatMonto(total: number | null | undefined, moneda: string | null | undefined): string {
  const amount = total ?? 0;
  const code = (moneda ?? 'PYG').toUpperCase();
  if (code === 'USD') {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'USD' }).format(amount);
  }
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount);
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
