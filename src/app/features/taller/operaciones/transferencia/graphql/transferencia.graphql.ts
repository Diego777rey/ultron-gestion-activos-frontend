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
    producto {
      id_producto
      codigo
      nombre
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
  }
  sector {
    id_sector
    nombre
  }
}`;
