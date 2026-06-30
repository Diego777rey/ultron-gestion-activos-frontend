import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GraphqlService } from '../../../../shared/services/graphql.service';
import { PersonaOutput } from '../../funcionarios/interfaces/funcionario.interface';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private readonly gql = inject(GraphqlService);

  buscarPorDocumento(documento: string): Observable<{ buscarPersonaPorDocumento: PersonaOutput | null }> {
    const document = `
      query BuscarPersonaPorDocumento($documento: String!) {
        buscarPersonaPorDocumento(documento: $documento) {
          nombre
          apellido
          email
          telefono
          direccion
        }
      }
    `;
    return this.gql.query<{ buscarPersonaPorDocumento: PersonaOutput | null }>(document, { documento });
  }
}
