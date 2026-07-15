import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { AppNotification, NotificationType } from '../../models/notification.model';

/** Icono Material asociado a cada severidad. */
const TYPE_ICONS: Record<NotificationType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/**
 * Contenedor global de avisos (toasts).
 * Se monta una única vez en la raíz de la aplicación y renderiza de forma
 * reactiva los avisos del `NotificationService`.
 *
 * Accesibilidad: los éxitos/info se anuncian con `role="status"` (aria-live polite)
 * y los errores/advertencias con `role="alert"` (aria-live assertive).
 */
@Component({
  selector: 'app-notification-container',
  imports: [],
  templateUrl: './notification-container.html',
  styleUrl: './notification-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'notification-container',
  },
})
export class NotificationContainerComponent {
  private readonly notificationService = inject(NotificationService);

  protected readonly notifications = this.notificationService.notifications;

  protected iconFor(notification: AppNotification): string {
    return notification.icon ?? TYPE_ICONS[notification.type];
  }

  protected roleFor(type: NotificationType): 'alert' | 'status' {
    return type === 'error' || type === 'warning' ? 'alert' : 'status';
  }

  protected dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  protected trackById = (n: AppNotification): number => n.id;
}
