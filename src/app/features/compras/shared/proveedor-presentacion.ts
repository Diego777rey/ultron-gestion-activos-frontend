import { ProveedorOutput, TipoPersona, VendedorOutput } from '../../../shared/models/compras.model';

export function nombreProveedor(proveedor: ProveedorOutput): string {
  const completo = proveedor.nombre_completo?.trim();
  if (completo) {
    return completo;
  }
  if (proveedor.tipo_persona === TipoPersona.JURIDICA) {
    return proveedor.razon_social?.trim() || 'Sin razón social';
  }
  const nombre = `${proveedor.nombre ?? ''} ${proveedor.apellido ?? ''}`.trim();
  return nombre || 'Sin nombre';
}

export function nombreVendedor(vendedor: VendedorOutput): string {
  const completo = vendedor.nombre_completo?.trim();
  if (completo) {
    return completo;
  }
  return `${vendedor.nombre ?? ''} ${vendedor.apellido ?? ''}`.trim() || 'Sin nombre';
}

export function etiquetaTipoPersona(tipo: string | null | undefined): string {
  if (tipo === TipoPersona.FISICA) {
    return 'Física';
  }
  if (tipo === TipoPersona.JURIDICA) {
    return 'Jurídica';
  }
  return '';
}

export function etiquetaActivo(activo: boolean | null | undefined): string {
  return activo ? 'Activo' : 'Inactivo';
}

export function contactoVendedor(vendedor: VendedorOutput): string {
  return vendedor.telefono?.trim() || vendedor.celular?.trim() || '';
}

export function coincideTexto(partes: Array<string | null | undefined>, consulta: string): boolean {
  return partes
    .filter((parte): parte is string => !!parte?.trim())
    .join(' ')
    .toLowerCase()
    .includes(consulta);
}
