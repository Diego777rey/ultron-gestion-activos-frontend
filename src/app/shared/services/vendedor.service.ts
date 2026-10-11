import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { VendedorOutput, VendedorInput } from '../models/compras.model';

const VENDEDOR_FIELDS = gql`
  fragment VendedorFields on VendedorOutput {
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
  }
`;

@Injectable({
  providedIn: 'root'
})
export class VendedorService {
  private readonly apollo = inject(Apollo);

  listarVendedores(): Observable<VendedorOutput[]> {
    return this.apollo.query<{ vendedores: VendedorOutput[] }>({
      query: gql`
        ${VENDEDOR_FIELDS}
        query {
          vendedores {
            ...VendedorFields
          }
        }
      `,
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.vendedores));
  }

  listarVendedoresActivos(): Observable<VendedorOutput[]> {
    return this.apollo.query<{ vendedoresActivos: VendedorOutput[] }>({
      query: gql`
        ${VENDEDOR_FIELDS}
        query {
          vendedoresActivos {
            ...VendedorFields
          }
        }
      `,
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.vendedoresActivos));
  }

  listarVendedoresPorProveedor(idProveedor: number): Observable<VendedorOutput[]> {
    return this.apollo.query<{ vendedoresPorProveedor: VendedorOutput[] }>({
      query: gql`
        ${VENDEDOR_FIELDS}
        query($idProveedor: ID!) {
          vendedoresPorProveedor(idProveedor: $idProveedor) {
            ...VendedorFields
          }
        }
      `,
      variables: { idProveedor },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.vendedoresPorProveedor));
  }

  obtenerVendedor(id: number): Observable<VendedorOutput> {
    return this.apollo.query<{ vendedor: VendedorOutput }>({
      query: gql`
        ${VENDEDOR_FIELDS}
        query($id: ID!) {
          vendedor(id: $id) {
            ...VendedorFields
          }
        }
      `,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.vendedor));
  }

  registrarVendedor(input: VendedorInput): Observable<VendedorOutput> {
    return this.apollo.mutate<{ registrarVendedor: VendedorOutput }>({
      mutation: gql`
        ${VENDEDOR_FIELDS}
        mutation($input: VendedorInput!) {
          registrarVendedor(input: $input) {
            ...VendedorFields
          }
        }
      `,
      variables: { input },
      refetchQueries: ['vendedores', 'vendedoresActivos']
    }).pipe(map(result => result.data!.registrarVendedor));
  }

  actualizarVendedor(id: number, input: VendedorInput): Observable<VendedorOutput> {
    return this.apollo.mutate<{ actualizarVendedor: VendedorOutput }>({
      mutation: gql`
        ${VENDEDOR_FIELDS}
        mutation($id: ID!, $input: VendedorInput!) {
          actualizarVendedor(id: $id, input: $input) {
            ...VendedorFields
          }
        }
      `,
      variables: { id, input },
      refetchQueries: ['vendedores', 'vendedoresActivos']
    }).pipe(map(result => result.data!.actualizarVendedor));
  }

  eliminarVendedor(id: number): Observable<boolean> {
    return this.apollo.mutate<{ eliminarVendedor: boolean }>({
      mutation: gql`
        mutation($id: ID!) {
          eliminarVendedor(id: $id)
        }
      `,
      variables: { id },
      refetchQueries: ['vendedores', 'vendedoresActivos']
    }).pipe(map(result => result.data!.eliminarVendedor));
  }
}
