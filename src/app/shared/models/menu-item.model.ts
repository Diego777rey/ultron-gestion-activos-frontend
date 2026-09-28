/**
 * Elemento de menú para el sidebar.
 * Soporta submenús desplegables con `children`.
 */
export interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  category?: string;
  /** Permisos requeridos para ver este item (al menos uno debe estar presente) */
  requiredPermissions?: string[];
  /** Si tiene children, se convierte en un grupo desplegable. */
  children?: MenuItem[];
}
