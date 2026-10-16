import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { BaseCrudService } from './base-crud.service';
import { CrudConfig } from '../models/crud-config.model';
import { CompraOutput, CompraInput, ProductoProveedorOutput, ItemCompraOutput } from '../models/compras.model';
import { PageResponse } from '../models/pagination.model';
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
    id_sector
    sector_nombre
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

  productosDeProveedorPaginado(
    idProveedor: number,
    page: number,
    size: number,
    filter?: string,
  ): Observable<PageResponse<ProductoProveedorOutput>> {
    const filtro = filter?.trim() ?? '';
    const hasFilter = filtro !== '';
    const document = `query($idProveedor: ID!, $page: Int!, $size: Int!${hasFilter ? ', $filter: String' : ''}) {
      productosDeProveedorPaginado(
        idProveedor: $idProveedor
        page: $page
        size: $size
        ${hasFilter ? 'filter: $filter' : ''}
      ) {
        content {
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
        pageInfo {
          pageNumber
          pageSize
          totalElements
          totalPages
          last
        }
      }
    }`;
    const variables: Record<string, unknown> = { idProveedor, page, size };
    if (hasFilter) variables['filter'] = filtro;
    return this.graphql
      .query<{ productosDeProveedorPaginado: PageResponse<ProductoProveedorOutput> }>(document, variables)
      .pipe(map((data) => data.productosDeProveedorPaginado));
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

  /** Compra con sus ítems, para editarla. */
  findConItems(id: number): Observable<CompraOutput | null> {
    const selection = this.config.selectionSet.replace(
      /}\s*$/,
      `  items {
        id_item_compra
        id_producto
        producto_nombre
        producto_codigo
        cantidad
        precio_costo
        subtotal
        tipo_iva
        iva
        fecha_vencimiento
      }
    }`,
    );
    const document = `query($id: ID!) { compra(id: $id) ${selection} }`;
    return this.loadingService.pageLoad(
      this.graphql
        .query<{ compra: CompraOutput | null }>(document, { id })
        .pipe(map((data) => data.compra ?? null)),
      { message: 'Cargando compra…', errorTitle: 'No se pudo cargar la compra' },
    );
  }

  asociarProductoProveedor(idProducto: number, idProveedor: number): Observable<ProductoProveedorOutput> {
    const document = `mutation($idProducto: ID!, $idProveedor: ID!) {
      asociarProductoProveedor(idProducto: $idProducto, idProveedor: $idProveedor) {
        id_producto_proveedor
        id_producto
        producto_nombre
        producto_codigo
        id_proveedor
        precio_ultima_compra
        fecha_ultima_compra
        activo
      }
    }`;
    return this.graphql
      .mutate<{ asociarProductoProveedor: ProductoProveedorOutput }>(document, { idProducto, idProveedor })
      .pipe(map((data) => data.asociarProductoProveedor));
  }

  desasociarProductoProveedor(idProducto: number, idProveedor: number): Observable<boolean> {
    const document = `mutation($idProducto: ID!, $idProveedor: ID!) {
      desasociarProductoProveedor(idProducto: $idProducto, idProveedor: $idProveedor)
    }`;
    return this.graphql
      .mutate<{ desasociarProductoProveedor: boolean }>(document, { idProducto, idProveedor })
      .pipe(map((data) => data.desasociarProductoProveedor ?? false));
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
