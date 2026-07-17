import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { VentaInput, VentaOutput } from '../interfaces/venta.interface';

const VENTA_SELECTION = `{
  id_venta
  numero
  fecha
  idSesionCaja
  idCliente
  clienteNombre
  subtotal
  descuento
  total
  estado
  detalles {
    id_detalle_venta
    idProducto
    productoNombre
    idPresentacion
    presentacionDescripcion
    cantidad
    precioUnitario
    subtotal
  }
}`;

@Injectable({ providedIn: 'root' })
export class VentaPosService {
  private readonly gql = inject(GraphqlService);
  private readonly notifications = inject(NotificationService);

  registrarVenta(input: VentaInput): Observable<VentaOutput> {
    const document = `mutation($input: VentaInput!) {
      registrarVenta(input: $input) ${VENTA_SELECTION}
    }`;
    return this.gql.mutate<{ registrarVenta: VentaOutput }>(document, { input }).pipe(
      map((data) => data.registrarVenta),
      map((venta) => {
        this.notifications.success(`Venta ${venta.numero} registrada`);
        return venta;
      })
    );
  }
}
