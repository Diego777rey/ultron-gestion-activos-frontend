export type TipoDenominacion = 'BILLETE' | 'MONEDA';

/** Cuántas unidades de un billete o moneda se entregan como parte del vuelto. */
export interface DenominacionVuelto {
  valor: number;
  tipo: TipoDenominacion;
  cantidad: number;
  subtotal: number;
}

/**
 * Resultado del cálculo de vuelto que hace el backend (`calcularVuelto`).
 * El cliente puede pagar en PYG o en una moneda con cotización activa (USD, BRL...)
 * y el cajero puede devolver en cualquier otra; todo se concilia en guaraníes.
 */
export interface VueltoCalculado {
  totalPyg: number;

  // ---- Lo que entrega el cliente ----
  /** Moneda en la que paga el cliente. */
  monedaRecibida: string;
  /** Guaraníes por unidad de la moneda recibida. `null` cuando es PYG. */
  cotizacionRecibida: number | null;
  /** Total a cobrar expresado en la moneda recibida. */
  totalMonedaRecibida: number;
  /** Lo que entregó el cliente, en la moneda recibida. `null` si todavía no se informó. */
  montoRecibido: number | null;
  /** Equivalente en guaraníes del monto recibido. */
  montoRecibidoPyg: number | null;
  /** Cuánto falta para cubrir el total, en la moneda recibida. Cero si alcanza. */
  faltante: number;
  suficiente: boolean;
  /** Importes que el cliente suele entregar, en la moneda recibida; el primero es el exacto. */
  montosSugeridos: number[];

  // ---- Lo que devuelve el cajero ----
  /** Moneda en la que se entrega el vuelto. */
  monedaVuelto: string;
  /** Guaraníes por unidad de la moneda del vuelto. `null` cuando es PYG. */
  cotizacionVuelto: number | null;
  /** Vuelto en guaraníes. */
  vueltoPyg: number;
  /** Vuelto expresado en `monedaVuelto`. Cero si el monto recibido no alcanza o no se informó. */
  vuelto: number;
  /** `false` si la moneda del vuelto no tiene catálogo de billetes y monedas. */
  desgloseDisponible: boolean;
  /** Billetes y monedas de `monedaVuelto` que arman el vuelto, de mayor a menor. */
  desglose: DenominacionVuelto[];
  /** Parte del vuelto (en `monedaVuelto`) que no se puede entregar con denominaciones en circulación. */
  residuo: number;
}
