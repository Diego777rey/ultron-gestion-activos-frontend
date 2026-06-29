import { ButtonVariant } from '../components/ui-button/ui-button';

/** Acción estándar de la barra lateral del listado genérico (Buscar, Limpiar, Adicionar, etc.). */
export interface ListToolbarAction {
  id: string;
  label: string;
  variant?: ButtonVariant;
}
