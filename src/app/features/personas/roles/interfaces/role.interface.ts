export interface RoleOutput {
  id?: string | null;
  descripcion?: string | null;
  activo?: string | null;
}

export interface RoleInput {
  descripcion: string;
  activo?: string | null;
}

/** Muestra el estado del rol. Los roles iniciales guardan "S" en lugar de "ACTIVO". */
export function etiquetaEstadoRol(activo?: string | null): string {
  const value = (activo ?? '').trim().toUpperCase();
  if (value === 'S' || value === 'SI' || value === 'SÍ' || value === 'ACTIVO' || value === 'TRUE') {
    return 'ACTIVO';
  }
  if (value === 'N' || value === 'NO' || value === 'INACTIVO' || value === 'FALSE') {
    return 'INACTIVO';
  }
  return value || '—';
}
