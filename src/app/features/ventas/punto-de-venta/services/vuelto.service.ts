import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { DenominacionVuelto, VueltoCalculado } from '../interfaces/vuelto.interface';
import { MONEDA_GUARANI } from '../models/monedas';

type Decimal = number | string;

interface VueltoGraphql {
  totalPyg: Decimal;
  monedaRecibida: string;
  cotizacionRecibida: Decimal | null;
  totalMonedaRecibida: Decimal;
  montoRecibido: Decimal | null;
  montoRecibidoPyg: Decimal | null;
  faltante: Decimal;
  suficiente: boolean;
  montosSugeridos: Decimal[];
  monedaVuelto: string;
  cotizacionVuelto: Decimal | null;
  vueltoPyg: Decimal;
  vuelto: Decimal;
  desgloseDisponible: boolean;
  desglose: {
    valor: Decimal;
    tipo: DenominacionVuelto['tipo'];
    cantidad: number;
    subtotal: Decimal;
  }[];
  residuo: Decimal;
}

const CALCULAR_VUELTO = `query(
  $totalPyg: BigDecimal!,
  $montoRecibido: BigDecimal,
  $monedaRecibida: String,
  $monedaVuelto: String
) {
  calcularVuelto(
    totalPyg: $totalPyg,
    montoRecibido: $montoRecibido,
    monedaRecibida: $monedaRecibida,
    monedaVuelto: $monedaVuelto
  ) {
    totalPyg
    monedaRecibida
    cotizacionRecibida
    totalMonedaRecibida
    montoRecibido
    montoRecibidoPyg
    faltante
    suficiente
    montosSugeridos
    monedaVuelto
    cotizacionVuelto
    vueltoPyg
    vuelto
    desgloseDisponible
    desglose {
      valor
      tipo
      cantidad
      subtotal
    }
    residuo
  }
}`;

/**
 * Pide al backend el cálculo del vuelto. La lógica (conversión por cotización,
 * desglose en billetes y monedas, sugerencias) vive en el servidor; acá solo se normalizan números.
 */
@Injectable({ providedIn: 'root' })
export class VueltoService {
  private readonly gql = inject(GraphqlService);

  /**
   * @param totalPyg total a cobrar en guaraníes.
   * @param montoRecibido lo que entregó el cliente en `monedaRecibida`; `null` para obtener solo las sugerencias.
   * @param monedaRecibida moneda en la que paga el cliente (PYG por defecto).
   * @param monedaVuelto moneda en la que el cajero entrega el vuelto (PYG por defecto).
   */
  calcular(
    totalPyg: number,
    montoRecibido: number | null,
    monedaRecibida: string = MONEDA_GUARANI,
    monedaVuelto: string = MONEDA_GUARANI,
  ): Observable<VueltoCalculado> {
    return this.gql
      .query<{ calcularVuelto: VueltoGraphql }>(CALCULAR_VUELTO, {
        totalPyg,
        montoRecibido,
        monedaRecibida,
        monedaVuelto,
      })
      .pipe(map((data) => normalizar(data.calcularVuelto)));
  }
}

function opcional(valor: Decimal | null | undefined): number | null {
  return valor == null ? null : Number(valor);
}

function normalizar(raw: VueltoGraphql): VueltoCalculado {
  return {
    totalPyg: Number(raw.totalPyg),
    monedaRecibida: raw.monedaRecibida,
    cotizacionRecibida: opcional(raw.cotizacionRecibida),
    totalMonedaRecibida: Number(raw.totalMonedaRecibida),
    montoRecibido: opcional(raw.montoRecibido),
    montoRecibidoPyg: opcional(raw.montoRecibidoPyg),
    faltante: Number(raw.faltante),
    suficiente: !!raw.suficiente,
    montosSugeridos: (raw.montosSugeridos ?? []).map((m) => Number(m)),
    monedaVuelto: raw.monedaVuelto,
    cotizacionVuelto: opcional(raw.cotizacionVuelto),
    vueltoPyg: Number(raw.vueltoPyg),
    vuelto: Number(raw.vuelto),
    desgloseDisponible: !!raw.desgloseDisponible,
    desglose: (raw.desglose ?? []).map((d) => ({
      valor: Number(d.valor),
      tipo: d.tipo,
      cantidad: Number(d.cantidad),
      subtotal: Number(d.subtotal),
    })),
    residuo: Number(raw.residuo ?? 0),
  };
}
