import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PdfViewerComponent } from '../../../../shared/components/pdf-viewer/pdf-viewer.component';
import { ReporteVisorService } from '../../../../shared/services/reporte-visor.service';

@Component({
  selector: 'app-reporte-visor',
  imports: [PdfViewerComponent],
  templateUrl: './reporte-visor.component.html',
  styleUrl: './reporte-visor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'reporte-visor-host' },
})
export class ReporteVisorComponent {
  protected readonly visor = inject(ReporteVisorService);

  protected seleccionar(id: string): void {
    this.visor.seleccionar(id);
  }

  protected cerrar(event: Event, id: string): void {
    event.stopPropagation();
    this.visor.cerrar(id);
  }

  protected formatFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(fecha);
  }
}
