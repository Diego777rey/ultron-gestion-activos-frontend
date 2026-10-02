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
import { FormaPago } from '../../interfaces/venta.interface';
import { CotizacionService } from '../../../../financiero/cotizaciones/services/cotizacion.service';
import { MontoCotizado } from '../../../../financiero/cotizaciones/interfaces/cotizacion.interface';

interface MetodoPago {
  codigo: FormaPago;
  label: string;
  icon: string;
  descripcion: string;
}

export interface PagoConfirmado {
  formaPago: FormaPago;
  moneda: string;
}

@Component({
  selector: 'app-pago-dialog',
  imports: [ModalComponent, UiButtonComponent, DecimalPipe],
  template: `
    <app-modal
      [open]="true"
      title="Forma de pago"
      subtitle="Seleccioná cómo se realizará el cobro"
      maxWidth="560px"
      headerVariant="primary"
      [closeOnBackdrop]="true"
      (closed)="onCancelar()"
    >
      <div class="pago-dialog">
        <div class="pago-dialog__total">
          <span class="pago-dialog__total-label">Total a cobrar</span>
          <strong class="pago-dialog__total-amount">
            @if (monedaSeleccionada() === 'PYG') {
              Gs. {{ total() | number: '1.0-0' }}
            } @else {
              {{ etiquetaMoneda(monedaSeleccionada()) }}
              {{ montoDe(monedaSeleccionada()) | number: '1.2-2' }}
            }
          </strong>
          @if (monedaSeleccionada() !== 'PYG') {
            <span class="pago-dialog__total-equivalente">
              Equivale a Gs. {{ total() | number: '1.0-0' }}
            </span>
          }
        </div>

        <div class="pago-dialog__monedas">
          <label class="pago-dialog__label">Moneda</label>
          @if (cargandoMontos()) {
            <span class="pago-dialog__cotizacion">Calculando montos...</span>
          } @else if (errorMontos()) {
            <span class="pago-dialog__cotizacion">{{ errorMontos() }}</span>
          }
          <div class="pago-dialog__moneda-selector" role="radiogroup" aria-label="Seleccionar moneda">
            @for (moneda of monedasDisponibles(); track moneda.codigo) {
              <button
                type="button"
                class="moneda-btn"
                [class.moneda-btn--selected]="monedaSeleccionada() === moneda.codigo"
                role="radio"
                [attr.aria-checked]="monedaSeleccionada() === moneda.codigo"
                (click)="seleccionarMoneda(moneda.codigo)"
              >
                <span class="moneda-btn__simbolo">{{ moneda.simbolo || moneda.label }}</span>
                @if (moneda.simbolo) {
                  <span class="moneda-btn__codigo">{{ moneda.label }}</span>
                }
                <span class="moneda-btn__monto">
                  {{ montoDe(moneda.codigo) | number: (moneda.codigo === 'PYG' ? '1.0-0' : '1.2-2') }}
                </span>
              </button>
            }
          </div>
          @if (cotizacionActual()) {
            <small class="pago-dialog__cotizacion">
              Cotización: 1 {{ monedaSeleccionada() }} = {{ cotizacionActual()!.valorCotizacion | number: '1.0-0' }} Gs.
            </small>
          }
        </div>

        <div class="pago-dialog__metodos" role="radiogroup" aria-label="Métodos de pago">
          @for (metodo of metodosPago; track metodo.codigo) {
            <button
              type="button"
              class="pago-metodo"
              role="radio"
              [class.pago-metodo--selected]="seleccionado() === metodo.codigo"
              [attr.aria-checked]="seleccionado() === metodo.codigo"
              (click)="seleccionar(metodo.codigo)"
            >
              <span class="pago-metodo__icon">
                <span class="material-icons" aria-hidden="true">{{ metodo.icon }}</span>
              </span>
              <div class="pago-metodo__info">
                <strong>{{ metodo.label }}</strong>
                <small>{{ metodo.descripcion }}</small>
              </div>
              @if (seleccionado() === metodo.codigo) {
                <span class="pago-metodo__check">
                  <span class="material-icons" aria-hidden="true">check_circle</span>
                </span>
              }
            </button>
          }
        </div>

        <footer class="pago-dialog__footer">
          <app-ui-button
            label="Cancelar"
            icon="close"
            variant="ghost"
            (clicked)="onCancelar()"
          />
          <app-ui-button
            [label]="botonLabel()"
            icon="payments"
            variant="primary"
            [disabled]="!seleccionado() || cargandoMontos() || !!errorMontos()"
            (clicked)="onConfirmar()"
          />
        </footer>
      </div>
    </app-modal>
  `,
  styles: `
    .pago-dialog {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
    }

    .pago-dialog__total {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 1rem;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      text-align: center;
    }

    .pago-dialog__total-label {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .pago-dialog__total-amount {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .pago-dialog__total-equivalente {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }
    
    .pago-dialog__monedas {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .pago-dialog__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .pago-dialog__moneda-selector {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .moneda-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      min-width: 100px;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-primary);
    }
    
    .moneda-btn:hover {
      border-color: #4a4a4a;
      background: #333333;
    }
    
    .moneda-btn--selected {
      border-color: var(--primary-color);
      background: var(--active-bg);
    }
    
    .moneda-btn__simbolo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .moneda-btn__codigo {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .moneda-btn__monto {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary-color);
      margin-top: 0.25rem;
    }
    
    .pago-dialog__cotizacion {
      font-size: 0.75rem;
      color: var(--text-muted);
      padding-left: 0.25rem;
    }

    .pago-dialog__metodos {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pago-metodo {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      color: var(--text-primary);
    }

    .pago-metodo:hover {
      border-color: #4a4a4a;
      background: #333333;
    }

    .pago-metodo--selected,
    .pago-metodo--selected:hover {
      border-color: var(--primary-color);
      background: var(--active-bg);
    }

    .pago-metodo__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #1e1e1e;
      color: var(--text-secondary);
    }

    .pago-metodo--selected .pago-metodo__icon {
      background: var(--primary-color);
      color: var(--on-primary-color);
    }

    .pago-metodo__icon .material-icons {
      font-size: 24px;
    }

    .pago-metodo__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .pago-metodo__info strong {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .pago-metodo__info small {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .pago-metodo__check {
      color: var(--primary-color);
    }

    .pago-metodo__check .material-icons {
      font-size: 24px;
    }

    .pago-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoDialogComponent implements OnInit {
  private readonly cotizacionService = inject(CotizacionService);

  readonly total = input.required<number>();

  readonly cancelar = output<void>();
  readonly confirmar = output<PagoConfirmado>();

  protected readonly seleccionado = signal<FormaPago | null>(null);
  protected readonly monedaSeleccionada = signal<string>('PYG');
  protected readonly montos = signal<MontoCotizado[]>([]);
  protected readonly cargandoMontos = signal(true);
  protected readonly errorMontos = signal<string | null>(null);

  protected readonly cotizacionActual = computed(() => {
    const moneda = this.monedaSeleccionada();
    if (moneda === 'PYG') return null;
    return this.montos().find((item) => item.moneda === moneda) ?? null;
  });

  protected readonly monedasDisponibles = computed(() =>
    this.montos().map((monto) => ({
      codigo: monto.moneda,
      simbolo: monto.moneda === 'PYG' ? 'Gs.' : this.simboloMoneda(monto.moneda),
      label: monto.moneda === 'PYG' ? 'Guaraníes' : monto.moneda,
    })),
  );

  protected readonly metodosPago: MetodoPago[] = [
    {
      codigo: 'EFECTIVO',
      label: 'Efectivo',
      icon: 'payments',
      descripcion: 'Pago en efectivo en caja',
    },
    {
      codigo: 'TARJETA',
      label: 'Tarjeta',
      icon: 'credit_card',
      descripcion: 'Pago con tarjeta de débito o crédito',
    },
    {
      codigo: 'TRANSFERENCIA',
      label: 'Transferencia',
      icon: 'account_balance',
      descripcion: 'Pago por transferencia bancaria',
    },
  ];

  protected readonly botonLabel = computed(() => {
    const metodo = this.seleccionado();
    if (!metodo) return 'Seleccioná un método';
    const found = this.metodosPago.find((m) => m.codigo === metodo);
    return `Cobrar con ${found?.label ?? 'método'}`;
  });

  ngOnInit(): void {
    this.cotizacionService.cotizarTotal(Number(this.total())).subscribe({
      next: (montos) => {
        this.montos.set(montos);
        this.cargandoMontos.set(false);
      },
      error: (err: Error) => {
        this.errorMontos.set(err.message || 'No se pudieron calcular los montos');
        this.cargandoMontos.set(false);
      },
    });
  }

  protected seleccionar(codigo: FormaPago): void {
    this.seleccionado.set(codigo);
  }
  
  protected seleccionarMoneda(codigo: string): void {
    this.monedaSeleccionada.set(codigo);
  }

  protected onCancelar(): void {
    this.cancelar.emit();
  }

  protected onConfirmar(): void {
    const metodo = this.seleccionado();
    if (metodo) {
      this.confirmar.emit({
        formaPago: metodo,
        moneda: this.monedaSeleccionada(),
      });
    }
  }

  protected etiquetaMoneda(codigo: string): string {
    const moneda = this.monedasDisponibles().find((item) => item.codigo === codigo);
    if (!moneda) {
      return codigo;
    }
    return moneda.simbolo || moneda.label;
  }

  protected montoDe(codigo: string): number | string | null {
    return this.montos().find((item) => item.moneda === codigo)?.monto ?? null;
  }

  private simboloMoneda(moneda: string): string {
    const clave = moneda
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    const simbolos: Record<string, string> = {
      pyg: 'Gs.',
      gs: 'Gs.',
      guarani: 'Gs.',
      guaranies: 'Gs.',
      usd: 'US$',
      dolar: 'US$',
      dolares: 'US$',
      brl: 'R$',
      real: 'R$',
      'real brasileno': 'R$',
      ars: '$',
      peso: '$',
      'peso argentino': '$',
      eur: '€',
      euro: '€',
    };
    return simbolos[clave] ?? '';
  }
}
