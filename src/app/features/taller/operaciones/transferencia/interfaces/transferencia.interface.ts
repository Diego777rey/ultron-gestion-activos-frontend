import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { ProductoOutput } from '../../../../inventario/productos/interfaces/producto.interface';

export type TransferenciaEstado = 'PENDIENTE' | 'CONFERIDO' | 'RECEPCIONADO' | string;

export interface PersonaResumen {
  id_persona?: number;
  nombre?: string;
  apellido?: string;
}

export interface TransferenciaDetalleOutput {
  id_detalle?: number;
  producto?: ProductoOutput | null;
  cantidad?: number;
}

export interface TransferenciaOutput {
  id_transferencia: number;
  numero: string;
  sectorOrigen?: SectorOutput | null;
  sectorDestino?: SectorOutput | null;
  observacion?: string | null;
  estado?: TransferenciaEstado;
  fecha?: string | null;
  persona?: PersonaResumen | null;
  cantidadItems?: number;
  detalles?: TransferenciaDetalleOutput[];
}

export interface TransferenciaDetalleInput {
  idProducto: number;
  cantidad: number;
}

export interface TransferenciaInput {
  idSectorOrigen: number;
  idSectorDestino: number;
  idPersona?: number | null;
}

export interface StockProductoSectorOutput {
  id_stock?: number;
  producto?: ProductoOutput | null;
  sector?: SectorOutput | null;
  cantidad?: number;
}
