/**
 * Severidad de un aviso. Determina el color, el icono y el rol ARIA
 * con el que se anuncia a los lectores de pantalla.
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Género gramatical de una entidad, usado para concordar los mensajes
 * automáticos de las operaciones CRUD en español
 * (ej. "El cliente ha sido registrado" / "La categoría ha sido registrada").
 */
export type EntityGender = 'm' | 'f';

/**
 * Aviso ya materializado que se muestra en pantalla.
 * Es inmutable: el estado vive en el `NotificationService`.
 */
export interface AppNotification {
  /** Identificador único incremental. */
  readonly id: number;
  /** Severidad del aviso. */
  readonly type: NotificationType;
  /** Título corto y descriptivo. */
  readonly title: string;
  /** Detalle opcional del aviso. */
  readonly message?: string;
  /** Milisegundos antes del autocierre. `0` mantiene el aviso hasta cerrarlo manualmente. */
  readonly duration: number;
  /** Indica si el usuario puede cerrarlo manualmente. */
  readonly dismissible: boolean;
  /** Icono Material a mostrar. Si se omite, se usa el icono por defecto de la severidad. */
  readonly icon?: string;
  /** Marca de tiempo de creación (epoch ms). */
  readonly createdAt: number;
}

/**
 * Opciones para personalizar un aviso genérico.
 */
export interface NotificationOptions {
  /** Título del aviso. Si se omite se usa uno por defecto según la severidad. */
  title?: string;
  /** Milisegundos antes del autocierre. `0` lo mantiene abierto. */
  duration?: number;
  /** Permite (o no) cerrarlo manualmente. Por defecto `true`. */
  dismissible?: boolean;
  /** Icono Material a mostrar. Si se omite, se usa el icono por defecto de la severidad. */
  icon?: string;
}

/**
 * Opciones para los avisos automáticos de operaciones sobre una entidad.
 */
export interface EntityNotificationOptions {
  /** Género gramatical de la entidad para concordar el mensaje. Por defecto `'m'`. */
  gender?: EntityGender;
  /** Nombre o identificador legible del registro afectado (ej. "Juan Pérez"). */
  name?: string;
}
