export interface RoleOutput {
  id?: string | null;
  descripcion?: string | null;
  activo?: string | null;
}

export interface RoleInput {
  descripcion: string;
  activo?: string | null;
}
