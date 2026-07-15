import { Injectable, computed, signal } from '@angular/core';
import {
  AppNotification,
  EntityGender,
  EntityNotificationOptions,
  NotificationOptions,
  NotificationType,
} from '../models/notification.model';

/** Duración por defecto (ms) de cada severidad. Los errores permanecen más tiempo. */
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

/** Título por defecto de cada severidad. */
const DEFAULT_TITLES: Record<NotificationType, string> = {
  success: 'Operación exitosa',
  info: 'Información',
  warning: 'Advertencia',
  error: 'Ocurrió un error',
};

/** Máximo de avisos visibles a la vez; los más antiguos se descartan. */
const MAX_VISIBLE = 5;

/**
 * Servicio genérico de avisos (notificaciones tipo *toast*) para todo el sistema.
 *
 * Cualquier módulo puede inyectarlo y disparar avisos consistentes:
 * - Genéricos: `success`, `error`, `warning`, `info`.
 * - De dominio: `created`, `updated`, `deleted` (concordancia gramatical en español).
 *
 * El estado se expone mediante signals de solo lectura para que el contenedor
 * los renderice de forma reactiva con `OnPush`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<readonly AppNotification[]>([]);

  /** Lista reactiva e inmutable de avisos actualmente en pantalla. */
  readonly notifications = this._notifications.asReadonly();

  /** Indica si hay al menos un aviso visible. */
  readonly hasNotifications = computed(() => this._notifications().length > 0);

  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private sequence = 0;

  // ==================== API genérica ====================

  /** Muestra un aviso de éxito. Devuelve el id del aviso creado. */
  success(message: string, options?: NotificationOptions): number {
    return this.show('success', message, options);
  }

  /** Muestra un aviso de error. */
  error(message: string, options?: NotificationOptions): number {
    return this.show('error', message, options);
  }

  /** Muestra un aviso de advertencia. */
  warning(message: string, options?: NotificationOptions): number {
    return this.show('warning', message, options);
  }

  /** Muestra un aviso informativo. */
  info(message: string, options?: NotificationOptions): number {
    return this.show('info', message, options);
  }

  /** Crea y encola un aviso con la severidad indicada. Devuelve su id. */
  show(type: NotificationType, message: string, options?: NotificationOptions): number {
    const id = ++this.sequence;
    const duration = options?.duration ?? DEFAULT_DURATIONS[type];
    const notification: AppNotification = {
      id,
      type,
      title: options?.title ?? DEFAULT_TITLES[type],
      message: message?.trim() || undefined,
      duration,
      dismissible: options?.dismissible ?? true,
      icon: options?.icon,
      createdAt: Date.now(),
    };

    this._notifications.update((list) => {
      const next = [...list, notification];
      // Descarta los más antiguos si se supera el máximo visible.
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });

    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
    return id;
  }

  /** Cierra un aviso por su id. */
  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  /** Cierra todos los avisos activos. */
  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this._notifications.set([]);
  }

  // ==================== API de dominio (CRUD) ====================

  /**
   * Aviso estándar de alta exitosa (verde).
   * Ej: "El cliente ha sido registrado correctamente."
   */
  created(entity: string, options?: EntityNotificationOptions): number {
    return this.show('success', this.buildEntityMessage(entity, 'registrad', options), {
      title: 'Registro exitoso',
      icon: 'check_circle',
    });
  }

  /** Aviso estándar de actualización exitosa (azul). */
  updated(entity: string, options?: EntityNotificationOptions): number {
    return this.show('info', this.buildEntityMessage(entity, 'actualizad', options), {
      title: 'Actualización exitosa',
      icon: 'edit',
    });
  }

  /** Aviso estándar de eliminación exitosa (rojo). */
  deleted(entity: string, options?: EntityNotificationOptions): number {
    return this.show('error', this.buildEntityMessage(entity, 'eliminad', options), {
      title: 'Eliminación exitosa',
      icon: 'delete',
      duration: 4000,
    });
  }

  /**
   * Construye un mensaje concordado en género y número.
   * @param entity Etiqueta de la entidad (ej. "Cliente", "Categoría").
   * @param verbStem Raíz del participio sin la vocal final ("registrad", "actualizad", "eliminad").
   */
  private buildEntityMessage(
    entity: string,
    verbStem: string,
    options?: EntityNotificationOptions,
  ): string {
    const gender: EntityGender = options?.gender ?? 'm';
    const article = gender === 'f' ? 'La' : 'El';
    const participle = `${verbStem}${gender === 'f' ? 'a' : 'o'}`;
    const label = entity.trim();
    const subject = options?.name?.trim()
      ? `${label} "${options.name.trim()}"`
      : label;
    return `${article} ${subject} ha sido ${participle} correctamente.`;
  }
}
