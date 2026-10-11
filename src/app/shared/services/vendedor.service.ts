import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from './base-crud.service';
import { CrudConfig } from '../models/crud-config.model';
import { VendedorOutput, VendedorInput } from '../models/compras.model';
import { GraphqlService } from './graphql.service';

const VENDEDOR_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'VendedorInput',
  selectionSet: `{
    id_vendedor
    id_proveedor
    proveedor_nombre
    nombre
    apellido
    telefono
    email
    celular
    cargo
    observaciones
    activo
    fecha_registro
    fecha_ultima_modificacion
    nombre_completo
  }`,
  operations: {
    list: 'vendedores',
    getById: 'vendedor',
    create: 'registrarVendedor',
    update: 'actualizarVendedor',
    remove: 'eliminarVendedor',
  },
  entity: { label: 'Vendedor', gender: 'm' },
};

@Injectable({ providedIn: 'root' })
export class VendedorService extends BaseCrudService<VendedorOutput, VendedorInput> {
  private readonly graphql = inject(GraphqlService);
  protected readonly config: CrudConfig = VENDEDOR_CRUD_CONFIG;

  protected override resolveEntityName(entity: VendedorOutput): string | undefined {
    return `${entity.nombre} ${entity.apellido}`.trim();
  }

  listarVendedoresPorProveedor(idProveedor: number): Observable<VendedorOutput[]> {
    const document = `query($idProveedor: ID!) {
      vendedoresPorProveedor(idProveedor: $idProveedor) ${this.config.selectionSet}
    }`;
    return this.graphql
      .query<{ vendedoresPorProveedor: VendedorOutput[] }>(document, { idProveedor })
      .pipe(map((data) => data.vendedoresPorProveedor ?? []));
  }
}
