import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainerComponent } from './shared/components/notification-container/notification-container';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay';
import { LoadingService } from './shared/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationContainerComponent, LoadingOverlayComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ultron-gestion-activos-frontend');
  protected readonly loading = inject(LoadingService);
}
