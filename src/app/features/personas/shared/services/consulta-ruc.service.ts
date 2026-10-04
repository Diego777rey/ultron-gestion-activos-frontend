import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';

/** Datos públicos de un contribuyente según la DNIT. */
export interface ContribuyenteRuc {
  /** RUC con dígito verificador (ej. 80012345-0). */
  ruc: string;
  /** Número de documento sin dígito verificador. */
  documento: string;
  razonSocial: string;
  /** Nombre listo para registrar; en personas físicas viene como "NOMBRE APELLIDO". */
  nombre: string;
  estado: string | null;
  activo: boolean;
  personaJuridica: boolean;
  entidadPublica: boolean;
}

/** CI o RUC con o sin dígito verificador: hasta 8 dígitos y opcional "-N". */
const FORMATO_RUC = /^\d{1,8}(-\d)?$/;
/** Por debajo de este largo casi seguro el usuario todavía está escribiendo. */
const DIGITOS_MINIMOS = 5;

export function esRucConsultable(valor: string | null | undefined): boolean {
  const limpio = normalizarRuc(valor);
  return FORMATO_RUC.test(limpio) && limpio.split('-')[0].length >= DIGITOS_MINIMOS;
}

export function normalizarRuc(valor: string | null | undefined): string {
  return (valor ?? '').replace(/[\s.]/g, '');
}

@Injectable({ providedIn: 'root' })
export class ConsultaRucService {
  private readonly gql = inject(GraphqlService);

  /** Emite `null` si el RUC no figura en la DNIT. */
  consultar(ruc: string): Observable<ContribuyenteRuc | null> {
    const document = `
      query ConsultarRuc($ruc: String!) {
        consultarRuc(ruc: $ruc) {
          ruc
          documento
          razonSocial
          nombre
          estado
          activo
          personaJuridica
          entidadPublica
        }
      }
    `;
    return this.gql
      .query<{ consultarRuc: ContribuyenteRuc | null }>(document, { ruc: normalizarRuc(ruc) })
      .pipe(map((data) => data.consultarRuc));
  }
}
