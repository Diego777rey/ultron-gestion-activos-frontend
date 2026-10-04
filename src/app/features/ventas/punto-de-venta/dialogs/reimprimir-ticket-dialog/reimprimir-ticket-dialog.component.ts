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
      subtitle="Reimprimí el ticket de una venta de esta sesión"
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
              <article class="venta-item">
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
                  <app-ui-button
                    label="Reimprimir"
                    icon="print"
                    variant="primary"
                    size="sm"
                    (clicked)="onReimprimir(venta)"
                  />
                </div>
              </article>
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
      background: #2a2a2a;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .reimprimir-dialog__buscar .material-icons {
      color: var(--text-muted);
      font-size: 20px;
    }

    .reimprimir-dialog__buscar input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.9375rem;
      color: var(--text-primary);
      outline: none;
    }

    .reimprimir-dialog__buscar input::placeholder {
      color: var(--text-muted);
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
      color: var(--text-muted);
      text-align: center;
    }

    .reimprimir-dialog__vacio .material-icons {
      font-size: 48px;
      opacity: 0.5;
    }

    .venta-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      text-align: left;
    }

    .venta-item__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .venta-item__numero {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .venta-item__fecha {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .venta-item__info {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
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
      color: var(--text-muted);
    }

    .venta-item__footer {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #3a3a3a;
    }

    .venta-item__forma-pago {
      font-size: 0.8125rem;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    .venta-item__total {
      margin-left: auto;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .venta-item__footer app-ui-button {
      flex: 0 0 auto;
    }

    .venta-item__footer ::ng-deep .ui-btn {
      min-width: 0;
    }

    .reimprimir-dialog__footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color);
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

  protected onCerrar(): void {
    this.cerrar.emit();
  }

  protected onReimprimir(venta: VentaOutput): void {
    this.reimprimir.emit(venta);
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
          this.ventas.set(this.ordenarRecientesPrimero(ventas));
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        },
      });
  }

  private ordenarRecientesPrimero(ventas: VentaOutput[]): VentaOutput[] {
    return [...ventas].sort((a, b) => {
      const diferencia = this.marcaTiempo(b.fecha) - this.marcaTiempo(a.fecha);
      if (diferencia !== 0) {
        return diferencia;
      }
      return (b.numero ?? '').localeCompare(a.numero ?? '');
    });
  }

  private marcaTiempo(fecha?: string): number {
    if (!fecha?.trim()) {
      return 0;
    }
    const valor = fecha.trim();
    const partes = valor.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (partes) {
      return new Date(
        Number(partes[3]),
        Number(partes[2]) - 1,
        Number(partes[1]),
        Number(partes[4] ?? 0),
        Number(partes[5] ?? 0),
        Number(partes[6] ?? 0),
      ).getTime();
    }
    const directa = Date.parse(valor);
    return Number.isNaN(directa) ? 0 : directa;
  }
}
