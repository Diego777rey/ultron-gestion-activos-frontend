export const TRANSFERENCIA_SELECTION = `{
  id_transferencia
  numero
  estado
  fecha
  cantidadItems
  sectorOrigen {
    id_sector
    nombre
  }
  sectorDestino {
    id_sector
    nombre
  }
  persona {
    id_persona
    nombre
    apellido
  }
  detalles {
    id_detalle
    cantidad
    estado
    motivoRechazo
    motivoRechazoDetalle
    idPresentacionProducto
    presentacionDescripcion
    cantidadPresentacion
    precioVenta
    cantidadTotal
    producto {
      id_producto
      codigo
      nombre
      precioVenta
      presentaciones {
        id_presentacion_producto
        descripcion
        cantidad
        precio
        principal
        estado
      }
    }
  }
}`;

export const STOCK_SECTOR_SELECTION = `{
  id_stock
  cantidad
  producto {
    id_producto
    codigo
    nombre
    stock
    precioVenta
    presentaciones {
      id_presentacion_producto
      descripcion
      cantidad
      precio
      principal
      estado
    }
  }
  sector {
    id_sector
    nombre
  }
}`;
