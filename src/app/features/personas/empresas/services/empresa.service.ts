import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseCrudService } from '../../../../shared/services/base-crud.service';
import { CrudConfig } from '../../../../shared/models/crud-config.model';
import { EMPRESA_CRUD_CONFIG } from '../graphql/empresa.graphql';
import { EmpresaInput, EmpresaOutput } from '../interfaces/empresa.interface';

@Injectable({
  providedIn: 'root',
})
export class EmpresaService extends BaseCrudService<EmpresaOutput, EmpresaInput> {
  protected readonly config: CrudConfig = EMPRESA_CRUD_CONFIG;

  protected override resolveEntityName(entity: EmpresaOutput): string | undefined {
    return entity.razon_social?.trim() || undefined;
  }

  getEmpresas(): Observable<EmpresaOutput[]> {
    return this.findAll();
  }

  getEmpresa(id: number): Observable<EmpresaOutput | null> {
    return this.findById(id.toString());
  }

  registrarEmpresa(input: EmpresaInput): Observable<EmpresaOutput> {
    return this.create(input);
  }

  actualizarEmpresa(id: number, input: EmpresaInput): Observable<EmpresaOutput> {
    return this.update(id.toString(), input);
  }

  eliminarEmpresa(id: number): Observable<boolean> {
    return this.delete(id.toString());
  }
}
