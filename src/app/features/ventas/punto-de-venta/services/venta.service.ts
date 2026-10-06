import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { FacturaOutput } from '../../../financiero/facturacion/interfaces/factura.interface';
import { VentaInput, VentaOutput } from '../interfaces/venta.interface';

const FACTURA_SELECTION = `{
  id_factura
  numero_factura
  timbrado
  fecha_emision
  cliente_nombre
  cliente_documento
  cliente_ruc
  cliente_direccion
  total_iva_5
  total_iva_10
  total_exenta
  total_iva
  total
  forma_pago
  empresa_razon_social
  empresa_nombre_fantasia
  empresa_ruc
  empresa_direccion
  empresa_telefono
  empresa_actividad_economica
  timbrado_vigencia_inicio
  timbrado_vigencia_fin
  detalles {
    descripcion
    cantidad
    precio_unitario
    subtotal
    tipo_iva
    monto_iva
  }
}`;

export interface VentaConFactura {
  venta: VentaOutput;
  factura: FacturaOutput;
}

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
  formaPago
  montoRecibido
  montoRecibidoPyg
  monedaVuelto
  vuelto
  vueltoPyg
  detalles {
    id_detalle_venta
    idProducto
    idPresentacion
    presentacionDescripcion
    idOrdenTrabajo
    idServicio
    productoNombre
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

  registrarVentaConFactura(input: VentaInput): Observable<VentaConFactura> {
    const document = `mutation($input: VentaInput!) {
      registrarVentaConFactura(input: $input) {
        venta ${VENTA_SELECTION}
        factura ${FACTURA_SELECTION}
      }
    }`;
    return this.gql.mutate<{ registrarVentaConFactura: VentaConFactura }>(document, { input }).pipe(
      map((data) => data.registrarVentaConFactura),
      map((resultado) => {
        this.notifications.success(`Factura ${resultado.factura.numero_factura} emitida`);
        return resultado;
      }),
    );
  }

  listarVentasPorSesion(idSesionCaja: number): Observable<VentaOutput[]> {
    const document = `query($idSesionCaja: ID!) {
      listarVentasPorSesion(idSesionCaja: $idSesionCaja) ${VENTA_SELECTION}
    }`;
    return this.gql
      .query<{ listarVentasPorSesion: VentaOutput[] }>(document, { idSesionCaja })
      .pipe(map((data) => data.listarVentasPorSesion ?? []));
  }
}
