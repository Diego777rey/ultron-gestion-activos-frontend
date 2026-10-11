import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { ProveedorOutput, ProveedorInput } from '../models/compras.model';

const PROVEEDOR_FIELDS = gql`
  fragment ProveedorFields on ProveedorOutput {
    id_proveedor
    tipo_persona
    nombre
    apellido
    razon_social
    nombre_comercial
    nombre_fantasia
    ruc
    documento
    direccion
    telefono
    email
    ciudad
    pais
    codigo_postal
    sitio_web
    observaciones
    activo
    fecha_registro
    fecha_ultima_modificacion
    nombre_completo
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ProveedorService {
  private readonly apollo = inject(Apollo);

  listarProveedores(): Observable<ProveedorOutput[]> {
    return this.apollo.query<{ proveedores: ProveedorOutput[] }>({
      query: gql`
        ${PROVEEDOR_FIELDS}
        query {
          proveedores {
            ...ProveedorFields
          }
        }
      `,
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.proveedores));
  }

  listarProveedoresActivos(): Observable<ProveedorOutput[]> {
    return this.apollo.query<{ proveedoresActivos: ProveedorOutput[] }>({
      query: gql`
        ${PROVEEDOR_FIELDS}
        query {
          proveedoresActivos {
            ...ProveedorFields
          }
        }
      `,
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.proveedoresActivos));
  }

  obtenerProveedor(id: number): Observable<ProveedorOutput> {
    return this.apollo.query<{ proveedor: ProveedorOutput }>({
      query: gql`
        ${PROVEEDOR_FIELDS}
        query($id: ID!) {
          proveedor(id: $id) {
            ...ProveedorFields
          }
        }
      `,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.proveedor));
  }

  registrarProveedor(input: ProveedorInput): Observable<ProveedorOutput> {
    return this.apollo.mutate<{ registrarProveedor: ProveedorOutput }>({
      mutation: gql`
        ${PROVEEDOR_FIELDS}
        mutation($input: ProveedorInput!) {
          registrarProveedor(input: $input) {
            ...ProveedorFields
          }
        }
      `,
      variables: { input },
      refetchQueries: ['proveedores', 'proveedoresActivos']
    }).pipe(map(result => result.data!.registrarProveedor));
  }

  actualizarProveedor(id: number, input: ProveedorInput): Observable<ProveedorOutput> {
    return this.apollo.mutate<{ actualizarProveedor: ProveedorOutput }>({
      mutation: gql`
        ${PROVEEDOR_FIELDS}
        mutation($id: ID!, $input: ProveedorInput!) {
          actualizarProveedor(id: $id, input: $input) {
            ...ProveedorFields
          }
        }
      `,
      variables: { id, input },
      refetchQueries: ['proveedores', 'proveedoresActivos']
    }).pipe(map(result => result.data!.actualizarProveedor));
  }

  eliminarProveedor(id: number): Observable<boolean> {
    return this.apollo.mutate<{ eliminarProveedor: boolean }>({
      mutation: gql`
        mutation($id: ID!) {
          eliminarProveedor(id: $id)
        }
      `,
      variables: { id },
      refetchQueries: ['proveedores', 'proveedoresActivos']
    }).pipe(map(result => result.data!.eliminarProveedor));
  }
}
