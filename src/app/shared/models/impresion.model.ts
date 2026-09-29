export interface PrinterInfo {
  name: string;
  displayName?: string;
  isDefault?: boolean;
}

export interface ImpresionResultado {
  success: boolean;
  message?: string | null;
}

export interface TicketLinea {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface TicketVenta {
  titulo?: string | null;
  subtitulo?: string | null;
  numero?: string | null;
  fecha?: string | null;
  cajero?: string | null;
  cliente?: string | null;
  lineas: TicketLinea[];
  descuento?: number | null;
  total: number;
  pie?: string | null;
}

export interface TicketCampo {
  etiqueta: string;
  valor: string;
}

export interface TicketOrdenTrabajo {
  empresa: string;
  direccion: string;
  telefono: string;
  numero?: string | null;
  fecha: string;
  hora: string;
  cliente: string;
  celular: string;
  ruc: string;
  codigoUnidad: string;
  vehiculo: string;
  vin: string;
  componentes: TicketCampo[];
  servicios: TicketCampo[];
  descripcionProblema: string;
  pagoRevision: number | null;
  recargoUrgente: number | null;
}

export interface TicketSegmento {
  texto: string;
  negrita?: boolean;
}

/** Renglón ya envuelto a 32 columnas; lo usan la vista previa y el builder ESC/POS. */
export type TicketRenglon =
  | { logo: true }
  | { centrado: boolean; segmentos: TicketSegmento[] };
