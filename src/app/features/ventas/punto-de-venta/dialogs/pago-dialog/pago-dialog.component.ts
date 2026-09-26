import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { FormaPago } from '../../interfaces/venta.interface';
import { CotizacionOutput } from '../../../../financiero/cotizaciones/interfaces/cotizacion.interface';

interface MetodoPago {
  codigo: FormaPago;
  label: string;
  icon: string;
  descripcion: string;
}

export interface PagoConfirmado {
  formaPago: FormaPago;
  moneda: string;
  montoMonedaOriginal: number;
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
            Gs. {{ total() | number: '1.0-0' }}
          </strong>
        </div>

        <div class="pago-dialog__monedas">
          <label class="pago-dialog__label">Moneda</label>
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
                <span class="moneda-btn__simbolo">{{ moneda.simbolo }}</span>
                <span class="moneda-btn__codigo">{{ moneda.codigo }}</span>
                @if (moneda.codigo !== 'PYG') {
                  <span class="moneda-btn__monto">
                    {{ totalEnMonedaSeleccionada() | number: '1.2-2' }}
                  </span>
                }
              </button>
            }
          </div>
          @if (cotizacionActual()) {
            <small class="pago-dialog__cotizacion">
              Cotización: 1 {{ monedaSeleccionada() }} = {{ cotizacionActual()!.valor | number: '1.0-0' }} Gs.
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
            [disabled]="!seleccionado()"
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
      background: var(--surface-subtle, #f8f9fa);
      border-radius: 12px;
      text-align: center;
    }

    .pago-dialog__total-label {
      font-size: 0.875rem;
      color: var(--text-muted, #6c757d);
    }

    .pago-dialog__total-amount {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary, #212529);
    }
    
    .pago-dialog__monedas {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .pago-dialog__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, #212529);
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
      background: var(--surface-card, #fff);
      border: 2px solid var(--border-default, #dee2e6);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .moneda-btn:hover {
      border-color: var(--border-hover, #adb5bd);
      background: var(--surface-hover, #f8f9fa);
    }
    
    .moneda-btn--selected {
      border-color: var(--primary, #0d6efd);
      background: var(--primary-subtle, #e7f1ff);
    }
    
    .moneda-btn__simbolo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #212529);
    }
    
    .moneda-btn__codigo {
      font-size: 0.75rem;
      color: var(--text-muted, #6c757d);
    }
    
    .moneda-btn__monto {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary, #0d6efd);
      margin-top: 0.25rem;
    }
    
    .pago-dialog__cotizacion {
      font-size: 0.75rem;
      color: var(--text-muted, #6c757d);
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
      background: var(--surface-card, #fff);
      border: 2px solid var(--border-default, #dee2e6);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
    }

    .pago-metodo:hover {
      border-color: var(--border-hover, #adb5bd);
      background: var(--surface-hover, #f8f9fa);
    }

    .pago-metodo--selected {
      border-color: var(--primary, #0d6efd);
      background: var(--primary-subtle, #e7f1ff);
    }

    .pago-metodo--selected:hover {
      border-color: var(--primary, #0d6efd);
      background: var(--primary-subtle, #e7f1ff);
    }

    .pago-metodo__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--surface-subtle, #f8f9fa);
      color: var(--text-secondary, #495057);
    }

    .pago-metodo--selected .pago-metodo__icon {
      background: var(--primary, #0d6efd);
      color: #fff;
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
      color: var(--text-primary, #212529);
    }

    .pago-metodo__info small {
      font-size: 0.8125rem;
      color: var(--text-muted, #6c757d);
    }

    .pago-metodo__check {
      color: var(--primary, #0d6efd);
    }

    .pago-metodo__check .material-icons {
      font-size: 24px;
    }

    .pago-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-default, #dee2e6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoDialogComponent {
  readonly total = input.required<number>();
  readonly cotizaciones = input<CotizacionOutput[]>([]);

  readonly cancelar = output<void>();
  readonly confirmar = output<PagoConfirmado>();

  protected readonly seleccionado = signal<FormaPago | null>(null);
  protected readonly monedaSeleccionada = signal<string>('PYG');
  
  protected readonly cotizacionActual = computed(() => {
    const moneda = this.monedaSeleccionada();
    if (moneda === 'PYG') return null;
    return this.cotizaciones().find(c => c.moneda === moneda) || null;
  });
  
  protected readonly totalEnMonedaSeleccionada = computed(() => {
    const totalPyg = this.total();
    const cotizacion = this.cotizacionActual();
    if (!cotizacion || cotizacion.valor === 0) return totalPyg;
    return totalPyg / cotizacion.valor;
  });
  
  protected readonly monedasDisponibles = computed(() => {
    const monedas = [{ codigo: 'PYG', simbolo: 'Gs.', label: 'Guaraníes' }];
    this.cotizaciones().forEach(cot => {
      monedas.push({
        codigo: cot.moneda,
        simbolo: this.simboloMoneda(cot.moneda),
        label: cot.moneda,
      });
    });
    return monedas;
  });

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
        montoMonedaOriginal: this.totalEnMonedaSeleccionada(),
      });
    }
  }
  
  private simboloMoneda(moneda: string): string {
    const simbolos: Record<string, string> = {
      'PYG': 'Gs.',
      'USD': 'US$',
      'BRL': 'R$',
      'ARS': '$',
      'EUR': '€',
    };
    return simbolos[moneda] || moneda;
  }
}
