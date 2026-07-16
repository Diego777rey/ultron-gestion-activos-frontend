import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { TabService } from '../../../shared/services/tab.service';

const POS_ROUTE = '/ventas/punto-de-venta';

@Component({
  selector: 'app-punto-de-venta',
  imports: [ModalComponent],
  templateUrl: './punto-de-venta.component.html',
  styleUrl: './punto-de-venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class PuntoDeVentaComponent {
  private readonly tabService = inject(TabService);
  private readonly router = inject(Router);

  readonly dialogOpen = signal(true);

  onSalir(): void {
    this.cerrarPuntoDeVenta();
  }

  private cerrarPuntoDeVenta(): void {
    const tabIndex = this.tabService.tabs().findIndex((tab) => tab.url === POS_ROUTE);
    if (tabIndex >= 0) {
      this.tabService.removeTab(tabIndex);
      return;
    }

    void this.router.navigateByUrl('/pantalla-principal');
  }
}
