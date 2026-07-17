import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { TabService } from '../../../shared/services/tab.service';
import { AbrirCajaDialogComponent } from './dialogs/abrir-caja-dialog/abrir-caja-dialog.component';

const POS_ROUTE = '/ventas/punto-de-venta';

@Component({
  selector: 'app-punto-de-venta',
  imports: [ModalComponent, AbrirCajaDialogComponent],
  templateUrl: './punto-de-venta.component.html',
  styleUrl: './punto-de-venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class PuntoDeVentaComponent {
  private readonly tabService = inject(TabService);
  private readonly router = inject(Router);

  /** Diálogo de bienvenida (Salir / Consultar / Abrir caja). */
  readonly inicioDialogOpen = signal(true);
  /** Diálogo del stepper de maletín / apertura / cierre. */
  readonly gestionCajaOpen = signal(false);

  readonly maletinVerificado = signal(false);
  readonly cajaAbierta = signal(false);

  readonly pasoInicialGestion = computed(() => {
    if (!this.maletinVerificado()) {
      return 1;
    }
    if (this.cajaAbierta()) {
      return 3;
    }
    return 2;
  });

  onSalirPos(): void {
    this.cerrarPuntoDeVenta();
  }

  onAbrirGestionCaja(): void {
    this.inicioDialogOpen.set(false);
    this.gestionCajaOpen.set(true);
  }

  onMaletinConfirmado(): void {
    this.maletinVerificado.set(true);
  }

  onCajaAbierta(): void {
    this.cajaAbierta.set(true);
    // Tras abrir, sale del diálogo para operar en el POS.
    this.gestionCajaOpen.set(false);
  }

  onCajaCerrada(): void {
    this.cajaAbierta.set(false);
    this.maletinVerificado.set(false);
    this.gestionCajaOpen.set(false);
    this.inicioDialogOpen.set(true);
  }

  onSalirGestionCaja(): void {
    this.gestionCajaOpen.set(false);
    if (this.cajaAbierta()) {
      // Caja abierta: permanece en el POS para operar.
      return;
    }
    // Todavía no abrió caja: vuelve al diálogo inicial.
    this.inicioDialogOpen.set(true);
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
