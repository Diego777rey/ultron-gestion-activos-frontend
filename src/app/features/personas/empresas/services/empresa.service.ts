import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  GET_EMPRESAS,
  GET_EMPRESA,
  REGISTRAR_EMPRESA,
  ACTUALIZAR_EMPRESA,
  ELIMINAR_EMPRESA,
} from '../graphql/empresa.graphql';
import { EmpresaInput, EmpresaOutput } from '../interfaces/empresa.interface';

@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private readonly apollo = inject(Apollo);

  getEmpresas(): Observable<EmpresaOutput[]> {
    return this.apollo
      .query<{ empresas: EmpresaOutput[] }>({
        query: GET_EMPRESAS,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data.empresas));
  }

  getEmpresa(id: number): Observable<EmpresaOutput> {
    return this.apollo
      .query<{ empresa: EmpresaOutput }>({
        query: GET_EMPRESA,
        variables: { id: id.toString() },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data.empresa));
  }

  registrarEmpresa(input: EmpresaInput): Observable<EmpresaOutput> {
    return this.apollo
      .mutate<{ registrarEmpresa: EmpresaOutput }>({
        mutation: REGISTRAR_EMPRESA,
        variables: { input },
      })
      .pipe(map((result) => result.data!.registrarEmpresa));
  }

  actualizarEmpresa(id: number, input: EmpresaInput): Observable<EmpresaOutput> {
    return this.apollo
      .mutate<{ actualizarEmpresa: EmpresaOutput }>({
        mutation: ACTUALIZAR_EMPRESA,
        variables: { id: id.toString(), input },
      })
      .pipe(map((result) => result.data!.actualizarEmpresa));
  }

  eliminarEmpresa(id: number): Observable<boolean> {
    return this.apollo
      .mutate<{ eliminarEmpresa: boolean }>({
        mutation: ELIMINAR_EMPRESA,
        variables: { id: id.toString() },
      })
      .pipe(map((result) => result.data!.eliminarEmpresa));
  }
}
