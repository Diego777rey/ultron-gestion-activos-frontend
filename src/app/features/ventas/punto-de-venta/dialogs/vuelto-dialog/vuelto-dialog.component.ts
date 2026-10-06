import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { VueltoDesgloseComponent } from '../../components/vuelto-desglose/vuelto-desglose.component';
import { VueltoCalculado } from '../../interfaces/vuelto.interface';
import { formatoMoneda, simboloMoneda } from '../../models/monedas';

/**
 * Se muestra justo después de cobrar en efectivo: le dice al cajero cuánto
 * devolver y con qué billetes y monedas. Se cierra con "Listo", Enter o Escape.
 */
@Component({
  selector: 'app-vuelto-dialog',
  imports: [ModalComponent, VueltoDesgloseComponent, DecimalPipe],
  template: `
    <app-modal
      [open]="true"
      title="Entregá el vuelto"
      [subtitle]="subtitulo()"
      maxWidth="820px"
      headerVariant="primary"
      (closed)="onListo()"
    >
      <div class="vuelto-dialog">
        <div class="vuelto-dialog__monto">
          <span class="vuelto-dialog__etiqueta">Vuelto</span>
          <strong class="vuelto-dialog__valor">
            {{ simboloVuelto() }} {{ vuelto().vuelto | number: formatoVuelto() }}
          </strong>
          @if (vuelto().cotizacionVuelto !== null) {
            <span class="vuelto-dialog__equivalente">Equivale a Gs. {{ vuelto().vueltoPyg | number: '1.0-0' }}</span>
          }
          <span class="vuelto-dialog__detalle">
            Recibido {{ simboloRecibido() }} {{ vuelto().montoRecibido | number: formatoRecibido() }}
            @if (vuelto().cotizacionRecibida !== null) {
              (Gs. {{ vuelto().montoRecibidoPyg | number: '1.0-0' }})
            }
            · Total Gs. {{ vuelto().totalPyg | number: '1.0-0' }}
          </span>
        </div>

        @if (vuelto().desgloseDisponible) {
          <app-vuelto-desglose
            [desglose]="vuelto().desglose"
            [residuo]="vuelto().residuo"
            [moneda]="vuelto().monedaVuelto"
            [grande]="true"
          />
        } @else {
          <p class="vuelto-dialog__nota">
            Esta moneda no tiene catálogo de billetes y monedas; entregá el importe indicado.
          </p>
        }

        <footer class="vuelto-dialog__footer">
          <button #listoBtn type="button" class="vuelto-dialog__listo" (click)="onListo()">
            <span class="material-icons" aria-hidden="true">check</span>
            Vuelto entregado
          </button>
        </footer>
      </div>
    </app-modal>
  `,
  styles: `
    .vuelto-dialog {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
    }

    .vuelto-dialog__monto {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 1.25rem 1rem;
      background: var(--active-bg);
      border: 1px solid var(--primary-color);
      border-radius: 12px;
      text-align: center;
    }

    .vuelto-dialog__etiqueta {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
    }

    .vuelto-dialog__valor {
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--text-primary);
    }

    .vuelto-dialog__equivalente {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .vuelto-dialog__detalle,
    .vuelto-dialog__nota {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .vuelto-dialog__nota {
      margin: 0;
      text-align: center;
    }

    .vuelto-dialog__footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color);
    }

    .vuelto-dialog__listo {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: var(--on-primary-color);
      border: none;
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    .vuelto-dialog__listo:hover {
      background: var(--primary-color-dark);
    }

    .vuelto-dialog__listo:focus-visible {
      outline: 2px solid var(--text-primary);
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VueltoDialogComponent {
  readonly vuelto = input.required<VueltoCalculado>();
  /** Número de la venta cobrada, para el subtítulo. */
  readonly numeroVenta = input<string | null>(null);

  readonly listo = output<void>();

  private readonly listoBtn = viewChild<ElementRef<HTMLButtonElement>>('listoBtn');

  protected readonly simboloVuelto = computed(() => simboloMoneda(this.vuelto().monedaVuelto));
  protected readonly formatoVuelto = computed(() => formatoMoneda(this.vuelto().monedaVuelto));
  protected readonly simboloRecibido = computed(() => simboloMoneda(this.vuelto().monedaRecibida));
  protected readonly formatoRecibido = computed(() => formatoMoneda(this.vuelto().monedaRecibida));

  constructor() {
    afterNextRender(() => this.listoBtn()?.nativeElement.focus());
  }

  protected subtitulo(): string {
    const numero = this.numeroVenta();
    return numero ? `Venta ${numero} cobrada` : 'Venta cobrada';
  }

  protected onListo(): void {
    this.listo.emit();
  }
}
