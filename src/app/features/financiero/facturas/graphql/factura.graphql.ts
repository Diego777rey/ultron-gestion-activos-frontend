export const FACTURA_SELECTION_SET = `{
  id_factura
  numero_factura
  timbrado
  fecha_emision
  id_venta
  id_cliente
  cliente_nombre
  cliente_documento
  cliente_ruc
  subtotal
  total_iva_5
  total_iva_10
  total_exenta
  total_iva
  total
  forma_pago
  moneda
  estado
  fecha_anulacion
  motivo_anulacion
  fecha_creacion
  empresa_razon_social
  empresa_nombre_fantasia
}`;

export const LISTAR_FACTURAS_CON_VENTAS = `
  query ListarFacturas($page: Int, $size: Int, $idEmpresa: ID!, $estado: String) {
    facturas: facturasPorEmpresaYEstado(
      idEmpresa: $idEmpresa
      estado: $estado
      page: $page
      size: $size
    ) {
      content ${FACTURA_SELECTION_SET}
      pageInfo {
        totalElements
        totalPages
        currentPage
        pageSize
        hasNext
        hasPrevious
      }
    }
  }
`;

export const BUSCAR_FACTURAS = `
  query BuscarFacturas($page: Int, $size: Int, $idEmpresa: ID!, $filtro: String!) {
    facturas: buscarFacturas(
      idEmpresa: $idEmpresa
      filtro: $filtro
      page: $page
      size: $size
    ) {
      content ${FACTURA_SELECTION_SET}
      pageInfo {
        totalElements
        totalPages
        currentPage
        pageSize
        hasNext
        hasPrevious
      }
    }
  }
`;

export const OBTENER_FACTURA_POR_ID = `
  query ObtenerFacturaPorId($id: ID!) {
    factura(id: $id) ${FACTURA_SELECTION_SET}
  }
`;
