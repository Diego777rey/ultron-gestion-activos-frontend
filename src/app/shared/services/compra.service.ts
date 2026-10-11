import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { CompraOutput, CompraInput, ProductoProveedorOutput, ItemCompraOutput } from '../models/compras.model';

const COMPRA_FIELDS = gql`
  fragment CompraFields on CompraOutput {
    id_compra
    id_proveedor
    proveedor_nombre
    id_vendedor
    vendedor_nombre
    numero_factura
    timbrado
    fecha_factura
    fecha_compra
    forma_pago
    moneda
    cotizacion
    subtotal
    total_iva
    total
    estado
    observaciones
    fecha_registro
    fecha_ultima_modificacion
  }
`;

const ITEM_COMPRA_FIELDS = gql`
  fragment ItemCompraFields on ItemCompraOutput {
    id_item_compra
    id_compra
    id_producto
    producto_nombre
    producto_codigo
    cantidad
    precio_costo
    subtotal
    tipo_iva
    iva
    fecha_vencimiento
    lote
    observaciones
    fecha_registro
  }
`;

const PRODUCTO_PROVEEDOR_FIELDS = gql`
  fragment ProductoProveedorFields on ProductoProveedorOutput {
    id_producto_proveedor
    id_producto
    producto_nombre
    producto_codigo
    id_proveedor
    proveedor_nombre
    precio_ultima_compra
    fecha_ultima_compra
    observaciones
    activo
    fecha_registro
  }
`;

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private readonly apollo = inject(Apollo);

  listarCompras(): Observable<CompraOutput[]> {
    return this.apollo.query<{ compras: CompraOutput[] }>({
      query: gql`
        ${COMPRA_FIELDS}
        query {
          compras {
            ...CompraFields
          }
        }
      `,
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.compras));
  }

  obtenerCompra(id: number): Observable<CompraOutput> {
    return this.apollo.query<{ compra: CompraOutput }>({
      query: gql`
        ${COMPRA_FIELDS}
        ${ITEM_COMPRA_FIELDS}
        query($id: ID!) {
          compra(id: $id) {
            ...CompraFields
            items {
              ...ItemCompraFields
            }
          }
        }
      `,
      variables: { id },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.compra));
  }

  listarComprasPorProveedor(idProveedor: number): Observable<CompraOutput[]> {
    return this.apollo.query<{ comprasPorProveedor: CompraOutput[] }>({
      query: gql`
        ${COMPRA_FIELDS}
        query($idProveedor: ID!) {
          comprasPorProveedor(idProveedor: $idProveedor) {
            ...CompraFields
          }
        }
      `,
      variables: { idProveedor },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.comprasPorProveedor));
  }

  productosDeProveedor(idProveedor: number): Observable<ProductoProveedorOutput[]> {
    return this.apollo.query<{ productosDeProveedor: ProductoProveedorOutput[] }>({
      query: gql`
        ${PRODUCTO_PROVEEDOR_FIELDS}
        query($idProveedor: ID!) {
          productosDeProveedor(idProveedor: $idProveedor) {
            ...ProductoProveedorFields
          }
        }
      `,
      variables: { idProveedor },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.productosDeProveedor));
  }

  historialCompraProducto(idProducto: number, idProveedor: number): Observable<ItemCompraOutput[]> {
    return this.apollo.query<{ historialCompraProducto: ItemCompraOutput[] }>({
      query: gql`
        ${ITEM_COMPRA_FIELDS}
        query($idProducto: ID!, $idProveedor: ID!) {
          historialCompraProducto(idProducto: $idProducto, idProveedor: $idProveedor) {
            ...ItemCompraFields
          }
        }
      `,
      variables: { idProducto, idProveedor },
      fetchPolicy: 'network-only'
    }).pipe(map(result => result.data.historialCompraProducto));
  }

  registrarCompra(input: CompraInput): Observable<CompraOutput> {
    return this.apollo.mutate<{ registrarCompra: CompraOutput }>({
      mutation: gql`
        ${COMPRA_FIELDS}
        mutation($input: CompraInput!) {
          registrarCompra(input: $input) {
            ...CompraFields
          }
        }
      `,
      variables: { input },
      refetchQueries: ['compras']
    }).pipe(map(result => result.data!.registrarCompra));
  }

  actualizarCompra(id: number, input: CompraInput): Observable<CompraOutput> {
    return this.apollo.mutate<{ actualizarCompra: CompraOutput }>({
      mutation: gql`
        ${COMPRA_FIELDS}
        mutation($id: ID!, $input: CompraInput!) {
          actualizarCompra(id: $id, input: $input) {
            ...CompraFields
          }
        }
      `,
      variables: { id, input },
      refetchQueries: ['compras', 'compra']
    }).pipe(map(result => result.data!.actualizarCompra));
  }

  cambiarEstadoCompra(id: number, estado: string): Observable<CompraOutput> {
    return this.apollo.mutate<{ cambiarEstadoCompra: CompraOutput }>({
      mutation: gql`
        ${COMPRA_FIELDS}
        mutation($id: ID!, $estado: String!) {
          cambiarEstadoCompra(id: $id, estado: $estado) {
            ...CompraFields
          }
        }
      `,
      variables: { id, estado },
      refetchQueries: ['compras']
    }).pipe(map(result => result.data!.cambiarEstadoCompra));
  }

  eliminarCompra(id: number): Observable<boolean> {
    return this.apollo.mutate<{ eliminarCompra: boolean }>({
      mutation: gql`
        mutation($id: ID!) {
          eliminarCompra(id: $id)
        }
      `,
      variables: { id },
      refetchQueries: ['compras']
    }).pipe(map(result => result.data!.eliminarCompra));
  }
}
