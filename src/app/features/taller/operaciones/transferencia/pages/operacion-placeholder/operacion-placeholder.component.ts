import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-operacion-placeholder',
  imports: [RouterLink],
  templateUrl: './operacion-placeholder.component.html',
  styleUrl: './operacion-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacionPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((d) => (d['title'] as string) || 'Próximamente')),
    { initialValue: 'Próximamente' }
  );
  protected readonly subtitle = toSignal(
    this.route.data.pipe(map((d) => (d['subtitle'] as string) || '')),
    { initialValue: '' }
  );
  protected readonly icon = toSignal(
    this.route.data.pipe(map((d) => (d['icon'] as string) || 'construction')),
    { initialValue: 'construction' }
  );
}
