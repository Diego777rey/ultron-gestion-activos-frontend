export type Moneda = 'REAL' | 'GUARANI' | 'DOLAR';

export interface CotizacionOutput {
  id_cotizacion: number;
  moneda: Moneda;
  valor: number;
  fechaActualizacion: string;
  activa: boolean;
}

export interface CotizacionInput {
  moneda: Moneda;
  valor: number;
  activa?: boolean;
}
