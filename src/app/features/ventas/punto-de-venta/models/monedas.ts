/** Utilidades de presentación de monedas del punto de venta. */

export const MONEDA_GUARANI = 'PYG';

/** Normaliza el código o nombre de una moneda tal como viene de las cotizaciones (p. ej. "Dólar", "USD"). */
export function claveMoneda(moneda: string | null | undefined): string {
  return (moneda ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const CODIGOS: Record<string, string> = {
  pyg: 'PYG',
  gs: 'PYG',
  guarani: 'PYG',
  guaranies: 'PYG',
  usd: 'USD',
  dolar: 'USD',
  dolares: 'USD',
  brl: 'BRL',
  real: 'BRL',
  reales: 'BRL',
  'real brasileno': 'BRL',
  ars: 'ARS',
  peso: 'ARS',
  'peso argentino': 'ARS',
  eur: 'EUR',
  euro: 'EUR',
};

const SIMBOLOS: Record<string, string> = {
  PYG: 'Gs.',
  USD: 'US$',
  BRL: 'R$',
  ARS: '$',
  EUR: '€',
};

/** Código ISO de la moneda a partir de su nombre libre; si no se reconoce devuelve el texto en mayúsculas. */
export function codigoMoneda(moneda: string | null | undefined): string {
  return CODIGOS[claveMoneda(moneda)] ?? (moneda ?? '').trim().toUpperCase();
}

export function esGuarani(moneda: string | null | undefined): boolean {
  return !moneda?.trim() || codigoMoneda(moneda) === MONEDA_GUARANI;
}

/** Símbolo para mostrar junto a un importe; si la moneda es desconocida devuelve su código. */
export function simboloMoneda(moneda: string | null | undefined): string {
  const codigo = codigoMoneda(moneda);
  return SIMBOLOS[codigo] ?? codigo;
}

/** Formato de `DecimalPipe` para una moneda: sin decimales en guaraníes, dos en el resto. */
export function formatoMoneda(moneda: string | null | undefined): string {
  return esGuarani(moneda) ? '1.0-0' : '1.2-2';
}
