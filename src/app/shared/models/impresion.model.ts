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
  /** Efectivo recibido, en `monedaRecibida`. Si viene, el ticket imprime Recibido y Vuelto. */
  montoRecibido?: number | null;
  /** Moneda en la que pagó el cliente. Vacío o "PYG" = guaraníes. */
  monedaRecibida?: string | null;
  /** Equivalente en guaraníes de `montoRecibido`, cuando se pagó en otra moneda. */
  montoRecibidoPyg?: number | null;
  /** Vuelto entregado, en `monedaVuelto`. */
  vuelto?: number | null;
  /** Moneda en la que se entregó el vuelto. Vacío o "PYG" = guaraníes. */
  monedaVuelto?: string | null;
  /** Equivalente en guaraníes de `vuelto`, cuando se devolvió en otra moneda. */
  vueltoPyg?: number | null;
  pie?: string | null;
}

/** Factura autoimpresa en papel. Los importes van con IVA incluido. */
export interface TicketFacturaLinea {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipoIva: string;
}

export interface TicketFactura {
  razonSocial: string;
  nombreFantasia?: string | null;
  ruc: string;
  direccion?: string | null;
  telefono?: string | null;
  actividadEconomica?: string | null;
  timbrado: string;
  vigenciaInicio: string;
  vigenciaFin: string;
  numeroFactura: string;
  fecha: string;
  condicion: string;
  formaPago?: string | null;
  clienteNombre: string;
  clienteDocumento?: string | null;
  clienteDireccion?: string | null;
  lineas: TicketFacturaLinea[];
  totalExenta: number;
  totalGravada5: number;
  totalGravada10: number;
  totalIva5: number;
  totalIva10: number;
  total: number;
}

export interface TicketCampo {
  etiqueta: string;
  valor: string;
}

/** Datos comunes a los tickets de orden de trabajo (equipo y vehículo). */
export interface TicketOrdenTrabajoBase {
  empresa: string;
  direccion: string;
  telefono: string;
  numero?: string | null;
  fecha: string;
  hora: string;
  cliente: string;
  celular: string;
  ruc: string;
  vehiculo: string;
  descripcionProblema: string;
  pagoRevision: number | null;
  recargoUrgente: number | null;
}

/** Ticket de recepción de equipos (ECU, tablero, módulos...). */
export interface TicketOrdenTrabajo extends TicketOrdenTrabajoBase {
  codigoUnidad: string;
  vin: string;
  componentes: TicketCampo[];
  servicios: TicketCampo[];
}

export type EstadoReparacion = 'SI' | 'NO' | 'PENDIENTE';

/** Condición observada al recibir el vehículo y si quedó reparada. */
export interface TicketCondicionVehiculo {
  etiqueta: string;
  reparado: EstadoReparacion;
}

/** Ticket de recepción de vehículos: estado al ingreso, falla y servicios realizados. */
export interface TicketOrdenTrabajoVehiculo extends TicketOrdenTrabajoBase {
  chapa: string;
  kilometraje: string;
  combustible: string;
  tipoFalla: string;
  condiciones: TicketCondicionVehiculo[];
  observacionesEstado: string;
  servicios: string[];
}

export interface TicketSegmento {
  texto: string;
  negrita?: boolean;
}

/** Renglón ya envuelto a 32 columnas; lo usan la vista previa y el builder ESC/POS. */
export type TicketRenglon =
  | { logo: true }
  | { centrado: boolean; segmentos: TicketSegmento[] };
