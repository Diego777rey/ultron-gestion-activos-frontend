import { TipoDenominacion } from '../interfaces/vuelto.interface';
import { codigoMoneda } from './monedas';

/**
 * Presentación de cada billete y moneda por divisa: etiqueta corta e imagen.
 * Las imágenes son recursos estáticos de la app (`public/monedas/<moneda>`), no se suben al backend.
 * El cálculo del vuelto lo hace el backend; este catálogo solo define cómo se dibuja cada pieza.
 *
 * Para agregar una imagen: copiar el archivo a `public/monedas/<moneda minúscula>/<valor>.<ext>`
 * y completar `imagen` en la entrada correspondiente. Mientras sea `null` se dibuja un genérico.
 */
export interface DenominacionVisual {
  valor: number;
  tipo: TipoDenominacion;
  /** Texto corto que acompaña la imagen, p. ej. "100 mil" o "US$ 20". */
  etiqueta: string;
  /** Ruta relativa al `public/` de la app. `null` si todavía no hay imagen. */
  imagen: string | null;
}

const PYG: readonly DenominacionVisual[] = [
  { valor: 100_000, tipo: 'BILLETE', etiqueta: '100 mil', imagen: 'monedas/pyg/100000.jpg' },
  { valor: 50_000, tipo: 'BILLETE', etiqueta: '50 mil', imagen: 'monedas/pyg/50000.jpg' },
  { valor: 20_000, tipo: 'BILLETE', etiqueta: '20 mil', imagen: 'monedas/pyg/20000.jpg' },
  { valor: 10_000, tipo: 'BILLETE', etiqueta: '10 mil', imagen: 'monedas/pyg/10000.jpg' },
  { valor: 5_000, tipo: 'BILLETE', etiqueta: '5 mil', imagen: 'monedas/pyg/5000.png' },
  { valor: 2_000, tipo: 'BILLETE', etiqueta: '2 mil', imagen: 'monedas/pyg/2000.png' },
  { valor: 1_000, tipo: 'MONEDA', etiqueta: '1 mil', imagen: 'monedas/pyg/1000.png' },
  { valor: 500, tipo: 'MONEDA', etiqueta: '500', imagen: 'monedas/pyg/500.png' },
  { valor: 100, tipo: 'MONEDA', etiqueta: '100', imagen: null },
  { valor: 50, tipo: 'MONEDA', etiqueta: '50', imagen: null },
];

/** Dólar estadounidense. Imágenes pendientes: `public/monedas/usd/<valor>.jpg`. */
const USD: readonly DenominacionVisual[] = [
  { valor: 100, tipo: 'BILLETE', etiqueta: 'US$ 100', imagen: null },
  { valor: 50, tipo: 'BILLETE', etiqueta: 'US$ 50', imagen: null },
  { valor: 20, tipo: 'BILLETE', etiqueta: 'US$ 20', imagen: null },
  { valor: 10, tipo: 'BILLETE', etiqueta: 'US$ 10', imagen: null },
  { valor: 5, tipo: 'BILLETE', etiqueta: 'US$ 5', imagen: null },
  { valor: 2, tipo: 'BILLETE', etiqueta: 'US$ 2', imagen: null },
  { valor: 1, tipo: 'BILLETE', etiqueta: 'US$ 1', imagen: null },
  { valor: 0.25, tipo: 'MONEDA', etiqueta: '25 ¢', imagen: null },
  { valor: 0.1, tipo: 'MONEDA', etiqueta: '10 ¢', imagen: null },
  { valor: 0.05, tipo: 'MONEDA', etiqueta: '5 ¢', imagen: null },
  { valor: 0.01, tipo: 'MONEDA', etiqueta: '1 ¢', imagen: null },
];

/** Real brasileño. Imágenes pendientes: `public/monedas/brl/<valor>.jpg`. */
const BRL: readonly DenominacionVisual[] = [
  { valor: 200, tipo: 'BILLETE', etiqueta: 'R$ 200', imagen: null },
  { valor: 100, tipo: 'BILLETE', etiqueta: 'R$ 100', imagen: null },
  { valor: 50, tipo: 'BILLETE', etiqueta: 'R$ 50', imagen: null },
  { valor: 20, tipo: 'BILLETE', etiqueta: 'R$ 20', imagen: null },
  { valor: 10, tipo: 'BILLETE', etiqueta: 'R$ 10', imagen: null },
  { valor: 5, tipo: 'BILLETE', etiqueta: 'R$ 5', imagen: null },
  { valor: 2, tipo: 'BILLETE', etiqueta: 'R$ 2', imagen: null },
  { valor: 1, tipo: 'MONEDA', etiqueta: 'R$ 1', imagen: null },
  { valor: 0.5, tipo: 'MONEDA', etiqueta: '50 centavos', imagen: null },
  { valor: 0.25, tipo: 'MONEDA', etiqueta: '25 centavos', imagen: null },
  { valor: 0.1, tipo: 'MONEDA', etiqueta: '10 centavos', imagen: null },
  { valor: 0.05, tipo: 'MONEDA', etiqueta: '5 centavos', imagen: null },
];

export const DENOMINACIONES: Readonly<Record<string, readonly DenominacionVisual[]>> = { PYG, USD, BRL };

const POR_MONEDA = new Map(
  Object.entries(DENOMINACIONES).map(([moneda, lista]) => [moneda, new Map(lista.map((d) => [d.valor, d]))]),
);

/** Devuelve la presentación de una denominación; para valores desconocidos arma un genérico. */
export function visualDenominacion(
  moneda: string | null | undefined,
  valor: number,
  tipo: TipoDenominacion,
): DenominacionVisual {
  const codigo = codigoMoneda(moneda || 'PYG');
  return (
    POR_MONEDA.get(codigo)?.get(valor) ?? {
      valor,
      tipo,
      etiqueta: etiquetaCorta(codigo, valor),
      imagen: null,
    }
  );
}

function etiquetaCorta(codigo: string, valor: number): string {
  if (codigo === 'PYG') {
    return valor >= 1000 && valor % 1000 === 0 ? `${valor / 1000} mil` : new Intl.NumberFormat('es-PY').format(valor);
  }
  return `${codigo} ${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(valor)}`;
}
