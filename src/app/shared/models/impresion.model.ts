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
