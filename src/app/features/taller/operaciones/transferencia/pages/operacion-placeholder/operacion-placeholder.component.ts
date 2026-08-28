import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';
import { ReporteService, TipoReporteInventario } from '../../../../../../shared/services/reporte.service';

@Component({
  selector: 'app-operacion-placeholder',
  imports: [UiButtonComponent],
  templateUrl: './operacion-placeholder.component.html',
  styleUrl: './operacion-placeholder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperacionPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reporteService = inject(ReporteService);

  protected readonly generando = signal(false);

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
  protected readonly reporteTipo = toSignal(
    this.route.data.pipe(map((d) => (d['reporteTipo'] as TipoReporteInventario | undefined) ?? null)),
    { initialValue: null }
  );

  protected generarReporte(): void {
    const tipo = this.reporteTipo();
    if (!tipo || this.generando()) {
      return;
    }
    this.generando.set(true);
    this.reporteService.generarInventario(tipo).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }
}
