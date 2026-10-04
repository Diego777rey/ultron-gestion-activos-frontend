import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { FacturaOutput } from '../interfaces/factura.interface';

const FACTURA_FIELDS = `
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
`;

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private readonly gql = inject(GraphqlService);

  porVenta(idVenta: number): Observable<FacturaOutput | null> {
    const document = `
      query($idVenta: ID!) {
        facturaPorVenta(idVenta: $idVenta) { ${FACTURA_FIELDS} }
      }
    `;
    return this.gql
      .query<{ facturaPorVenta: FacturaOutput | null }>(document, { idVenta: String(idVenta) })
      .pipe(map((data) => data.facturaPorVenta ?? null));
  }
}
