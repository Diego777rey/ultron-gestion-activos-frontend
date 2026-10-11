import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { BaseCrudService } from './base-crud.service';
import { CrudConfig } from '../models/crud-config.model';
import { CompraOutput, CompraInput, ProductoProveedorOutput, ItemCompraOutput } from '../models/compras.model';
import { GraphqlService } from './graphql.service';
import { LoadingService } from './loading.service';

const COMPRA_CRUD_CONFIG: CrudConfig = {
  inputTypeName: 'CompraInput',
  selectionSet: `{
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
  }`,
  operations: {
    list: 'compras',
    getById: 'compra',
    create: 'registrarCompra',
    update: 'actualizarCompra',
    remove: 'eliminarCompra',
  },
  entity: { label: 'Compra', gender: 'f' },
};

@Injectable({ providedIn: 'root' })
export class CompraService extends BaseCrudService<CompraOutput, CompraInput> {
  private readonly graphql = inject(GraphqlService);
  private readonly loadingService = inject(LoadingService);
  protected readonly config: CrudConfig = COMPRA_CRUD_CONFIG;

  protected override resolveEntityName(entity: CompraOutput): string | undefined {
    return entity.numero_factura || `Compra #${entity.id_compra}`;
  }

  listarComprasPorProveedor(idProveedor: number): Observable<CompraOutput[]> {
    const document = `query($idProveedor: ID!) {
      comprasPorProveedor(idProveedor: $idProveedor) ${this.config.selectionSet}
    }`;
    return this.graphql
      .query<{ comprasPorProveedor: CompraOutput[] }>(document, { idProveedor })
      .pipe(map((data) => data.comprasPorProveedor ?? []));
  }

  productosDeProveedor(idProveedor: number): Observable<ProductoProveedorOutput[]> {
    const document = `query($idProveedor: ID!) {
      productosDeProveedor(idProveedor: $idProveedor) {
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
    }`;
    return this.graphql
      .query<{ productosDeProveedor: ProductoProveedorOutput[] }>(document, { idProveedor })
      .pipe(map((data) => data.productosDeProveedor ?? []));
  }

  historialCompraProducto(idProducto: number, idProveedor: number): Observable<ItemCompraOutput[]> {
    const document = `query($idProducto: ID!, $idProveedor: ID!) {
      historialCompraProducto(idProducto: $idProducto, idProveedor: $idProveedor) {
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
    }`;
    return this.graphql
      .query<{ historialCompraProducto: ItemCompraOutput[] }>(document, { idProducto, idProveedor })
      .pipe(map((data) => data.historialCompraProducto ?? []));
  }

  cambiarEstadoCompra(id: number, estado: string): Observable<CompraOutput> {
    const document = `mutation($id: ID!, $estado: String!) {
      cambiarEstadoCompra(id: $id, estado: $estado) ${this.config.selectionSet}
    }`;
    return this.loadingService.track(
      this.graphql
        .mutate<{ cambiarEstadoCompra: CompraOutput }>(document, { id, estado })
        .pipe(map((data) => data.cambiarEstadoCompra)),
      { message: 'Cambiando estado...', errorTitle: 'No se pudo cambiar el estado' }
    );
  }
}
