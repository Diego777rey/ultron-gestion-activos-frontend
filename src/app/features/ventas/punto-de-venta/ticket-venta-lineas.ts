import { TicketLinea } from '../../../shared/models/impresion.model';
import { DetalleVentaOutput } from './interfaces/venta.interface';

/**
 * Líneas del ticket de venta. Una orden se imprime servicio por servicio
 * (y producto por producto) cuando el cobro trae ese desglose.
 */
export function lineasTicketVenta(detalles: DetalleVentaOutput[] | null | undefined): TicketLinea[] {
  return (detalles ?? []).flatMap((detalle) => {
    const partes = detalle.lineasOrden ?? [];
    if (partes.length > 0) {
      return partes.map((parte) =>
        linea(parte.descripcion, parte.cantidad, parte.precioUnitario, parte.subtotal),
      );
    }
    return [linea(detalle.productoNombre, detalle.cantidad, detalle.precioUnitario, detalle.subtotal)];
  });
}

function linea(
  descripcion: string | null | undefined,
  cantidad: number | null | undefined,
  precioUnitario: number | null | undefined,
  subtotal: number | null | undefined,
): TicketLinea {
  const cant = Number(cantidad ?? 1);
  const precio = Number(precioUnitario ?? 0);
  return {
    descripcion: descripcion?.trim() || 'Item',
    cantidad: cant,
    precioUnitario: precio,
    subtotal: Number(subtotal ?? cant * precio),
  };
}
