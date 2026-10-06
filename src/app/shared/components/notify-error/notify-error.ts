import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

/**
 * Muestra un mensaje de error en el sistema genérico de notificaciones
 * y no deja nada visible en la pantalla.
 */
@Component({
  selector: 'app-notify-error',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: none' },
})
export class NotifyErrorComponent {
  private readonly notifications = inject(NotificationService);

  readonly message = input<string | null | undefined>(null);

  constructor() {
    effect(() => {
      const message = this.message()?.trim();
      if (message) {
        this.notifications.error(message);
      }
    });
  }
}
