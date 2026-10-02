export interface CotizacionOutput {
  id_cotizacion: number;
  moneda: string;
  valor: number;
  fechaActualizacion: string;
  activa: boolean;
}

export interface CotizacionInput {
  moneda: string;
  valor: number;
  activa?: boolean;
}

export interface MontoCotizado {
  moneda: string;
  valorCotizacion?: number | string | null;
  monto: number | string;
}
