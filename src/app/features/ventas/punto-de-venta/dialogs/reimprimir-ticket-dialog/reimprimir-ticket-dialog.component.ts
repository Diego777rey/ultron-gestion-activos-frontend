import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { VentaOutput } from '../../interfaces/venta.interface';
import { VentaPosService } from '../../services/venta.service';
import { LoadingService } from '../../../../../shared/services/loading.service';

@Component({
  selector: 'app-reimprimir-ticket-dialog',
  imports: [ModalComponent, UiButtonComponent, DecimalPipe],
  template: `
    <app-modal
      [open]="true"
      title="Reimprimir ticket"
      subtitle="Seleccioná la venta para reimprimir el ticket"
      maxWidth="720px"
      headerVariant="primary"
      [closeOnBackdrop]="true"
      (closed)="onCerrar()"
    >
      <div class="reimprimir-dialog">
        <div class="reimprimir-dialog__buscar">
          <span class="material-icons" aria-hidden="true">search</span>
          <input
            type="search"
            placeholder="Buscar por número de venta, cliente..."
            [value]="busqueda()"
            (input)="onBusquedaInput($any($event.target).value)"
            aria-label="Buscar venta"
          />
        </div>

        <div class="reimprimir-dialog__lista">
          @if (cargando()) {
            <div class="reimprimir-dialog__vacio">
              <span class="material-icons">hourglass_top</span>
              <span>Cargando ventas...</span>
            </div>
          } @else {
            @for (venta of ventasFiltradas(); track venta.id_venta) {
              <button
                type="button"
                class="venta-item"
                [class.venta-item--selected]="ventaSeleccionada()?.id_venta === venta.id_venta"
                (click)="seleccionarVenta(venta)"
              >
                <div class="venta-item__header">
                  <strong class="venta-item__numero">{{ venta.numero }}</strong>
                  <span class="venta-item__fecha">{{ formatearFecha(venta.fecha) }}</span>
                </div>
                <div class="venta-item__info">
                  <span class="venta-item__cliente">
                    <span class="material-icons" aria-hidden="true">person</span>
                    {{ venta.clienteNombre || 'Consumidor final' }}
                  </span>
                  <span class="venta-item__items">
                    {{ contarItems(venta) }} {{ contarItems(venta) === 1 ? 'ítem' : 'ítems' }}
                  </span>
                </div>
                <div class="venta-item__footer">
                  <span class="venta-item__forma-pago">
                    {{ formatearFormaPago(venta.formaPago) }}
                  </span>
                  <strong class="venta-item__total">
                    Gs. {{ venta.total | number: '1.0-0' }}
                  </strong>
                </div>
                @if (ventaSeleccionada()?.id_venta === venta.id_venta) {
                  <span class="venta-item__check">
                    <span class="material-icons" aria-hidden="true">check_circle</span>
                  </span>
                }
              </button>
            } @empty {
              <div class="reimprimir-dialog__vacio">
                <span class="material-icons">receipt_long</span>
                <span>No se encontraron ventas</span>
              </div>
            }
          }
        </div>

        <footer class="reimprimir-dialog__footer">
          <app-ui-button
            label="Cancelar"
            icon="close"
            variant="ghost"
            (clicked)="onCerrar()"
          />
          <app-ui-button
            label="Reimprimir ticket"
            icon="print"
            variant="primary"
            [disabled]="!ventaSeleccionada()"
            (clicked)="onReimprimir()"
          />
        </footer>
      </div>
    </app-modal>
  `,
  styles: `
    .reimprimir-dialog {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      height: 600px;
      max-height: 70vh;
    }

    .reimprimir-dialog__buscar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface-subtle, #f8f9fa);
      border: 1px solid var(--border-default, #dee2e6);
      border-radius: 8px;
    }

    .reimprimir-dialog__buscar .material-icons {
      color: var(--text-muted, #6c757d);
      font-size: 20px;
    }

    .reimprimir-dialog__buscar input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.9375rem;
      color: var(--text-primary, #212529);
      outline: none;
    }

    .reimprimir-dialog__buscar input::placeholder {
      color: var(--text-muted, #6c757d);
    }

    .reimprimir-dialog__lista {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      padding: 0.25rem;
    }

    .reimprimir-dialog__vacio {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem 1rem;
      color: var(--text-muted, #6c757d);
      text-align: center;
    }

    .reimprimir-dialog__vacio .material-icons {
      font-size: 48px;
      opacity: 0.5;
    }

    .venta-item {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      background: var(--surface-card, #fff);
      border: 2px solid var(--border-default, #dee2e6);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
    }

    .venta-item:hover {
      border-color: var(--border-hover, #adb5bd);
      background: var(--surface-hover, #f8f9fa);
    }

    .venta-item--selected {
      border-color: var(--primary, #0d6efd);
      background: var(--primary-subtle, #e7f1ff);
    }

    .venta-item--selected:hover {
      border-color: var(--primary, #0d6efd);
      background: var(--primary-subtle, #e7f1ff);
    }

    .venta-item__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .venta-item__numero {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary, #212529);
    }

    .venta-item__fecha {
      font-size: 0.8125rem;
      color: var(--text-muted, #6c757d);
    }

    .venta-item__info {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #495057);
    }

    .venta-item__cliente {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex: 1;
    }

    .venta-item__cliente .material-icons {
      font-size: 16px;
    }

    .venta-item__items {
      color: var(--text-muted, #6c757d);
    }

    .venta-item__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-subtle, #e9ecef);
    }

    .venta-item__forma-pago {
      font-size: 0.8125rem;
      color: var(--text-muted, #6c757d);
      text-transform: capitalize;
    }

    .venta-item__total {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary, #0d6efd);
    }

    .venta-item__check {
      position: absolute;
      top: 1rem;
      right: 1rem;
      color: var(--primary, #0d6efd);
    }

    .venta-item__check .material-icons {
      font-size: 24px;
    }

    .reimprimir-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-default, #dee2e6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimprimirTicketDialogComponent implements OnInit {
  private readonly ventaService = inject(VentaPosService);
  private readonly loading = inject(LoadingService);

  readonly idSesionCaja = input.required<number>();

  readonly cerrar = output<void>();
  readonly reimprimir = output<VentaOutput>();

  protected readonly ventas = signal<VentaOutput[]>([]);
  protected readonly cargando = signal(false);
  protected readonly busqueda = signal('');
  protected readonly ventaSeleccionada = signal<VentaOutput | null>(null);

  protected readonly ventasFiltradas = computed(() => {
    const buscar = this.busqueda().trim().toLowerCase();
    const items = this.ventas();

    if (!buscar) {
      return items;
    }

    return items.filter((venta) => {
      const numero = (venta.numero ?? '').toLowerCase();
      const cliente = (venta.clienteNombre ?? 'consumidor final').toLowerCase();
      return numero.includes(buscar) || cliente.includes(buscar);
    });
  });

  ngOnInit(): void {
    this.cargarVentas();
  }

  protected onBusquedaInput(value: string): void {
    this.busqueda.set(value);
  }

  protected seleccionarVenta(venta: VentaOutput): void {
    this.ventaSeleccionada.set(venta);
  }

  protected onCerrar(): void {
    this.cerrar.emit();
  }

  protected onReimprimir(): void {
    const venta = this.ventaSeleccionada();
    if (venta) {
      this.reimprimir.emit(venta);
    }
  }

  protected formatearFecha(fecha?: string): string {
    if (!fecha) {
      return '';
    }
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) {
      return fecha;
    }
    return parsed.toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatearFormaPago(formaPago?: string): string {
    if (!formaPago) {
      return 'Efectivo';
    }
    const formas: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      TARJETA: 'Tarjeta',
      TRANSFERENCIA: 'Transferencia',
    };
    return formas[formaPago] || formaPago;
  }

  protected contarItems(venta: VentaOutput): number {
    return (venta.detalles ?? []).length;
  }

  private cargarVentas(): void {
    this.cargando.set(true);
    this.loading
      .track(this.ventaService.listarVentasPorSesion(this.idSesionCaja()), {
        message: 'Cargando ventas...',
        errorTitle: 'No se pudieron cargar las ventas',
      })
      .subscribe({
        next: (ventas) => {
          this.ventas.set(ventas.reverse());
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        },
      });
  }
}
