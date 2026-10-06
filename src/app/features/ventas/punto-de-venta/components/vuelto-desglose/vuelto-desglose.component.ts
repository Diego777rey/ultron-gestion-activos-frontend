import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { DenominacionVuelto } from '../../interfaces/vuelto.interface';
import { DenominacionVisual, visualDenominacion } from '../../models/denominaciones';
import { formatoMoneda, simboloMoneda } from '../../models/monedas';

interface PiezaVuelto extends DenominacionVuelto {
  visual: DenominacionVisual;
}

/**
 * Muestra el vuelto desglosado en billetes y monedas: una ficha por denominación
 * con la foto, un badge «×N» y el subtotal. Es solo presentación: el desglose viene del backend.
 */
@Component({
  selector: 'app-vuelto-desglose',
  imports: [DecimalPipe, NgOptimizedImage],
  template: `
    <ul class="desglose" [class.desglose--grande]="grande()" aria-label="Billetes y monedas del vuelto">
      @for (pieza of piezas(); track pieza.valor) {
        <li class="pieza">
          <div class="pieza__imagen" [class.pieza__imagen--moneda]="pieza.tipo === 'MONEDA'">
            @if (pieza.visual.imagen; as imagen) {
              <img [ngSrc]="imagen" fill [alt]="altDe(pieza)" />
            } @else {
              <span class="pieza__generica" aria-hidden="true">{{ textoGenerico(pieza.valor) }}</span>
            }
            <span class="pieza__badge" [attr.aria-label]="pieza.cantidad + ' unidades'">×{{ pieza.cantidad }}</span>
          </div>
          <div class="pieza__info">
            <strong>{{ pieza.visual.etiqueta }}</strong>
            <small>
              {{ pieza.tipo === 'MONEDA' ? 'Moneda' : 'Billete' }} · {{ simbolo() }}
              {{ pieza.subtotal | number: formato() }}
            </small>
          </div>
        </li>
      }
    </ul>
    @if (residuo() > 0) {
      <p class="desglose__residuo">
        <span class="material-icons" aria-hidden="true">info</span>
        {{ simbolo() }} {{ residuo() | number: formato() }} no se pueden entregar con billetes ni monedas en circulación.
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .desglose {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
      gap: 0.5rem;
    }

    .pieza {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.5rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      text-align: center;
    }

    .pieza__imagen {
      position: relative;
      flex: 0 0 auto;
      width: 100px;
      height: 44px;
      border-radius: 4px;
      background: var(--surface-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .pieza__imagen--moneda {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      box-shadow: none;
    }

    .pieza__imagen img {
      object-fit: contain;
      border-radius: inherit;
    }

    .pieza__generica {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      border: 2px solid var(--border-strong-hover);
      border-radius: 50%;
    }

    .pieza__badge {
      position: absolute;
      right: -10px;
      bottom: -10px;
      min-width: 2.25rem;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      background: var(--primary-color);
      color: var(--on-primary-color);
      font-size: 1.125rem;
      font-weight: 800;
      line-height: 1.4;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    }

    .pieza__info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .pieza__info strong {
      font-size: 0.9375rem;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .pieza__info small {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Modo grande: fichas más grandes para el diálogo de entrega del vuelto. */
    .desglose--grande {
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 0.75rem;
    }

    .desglose--grande .pieza {
      gap: 0.875rem;
      padding: 1rem 0.75rem 0.75rem;
    }

    .desglose--grande .pieza__imagen {
      width: 150px;
      height: 66px;
    }

    .desglose--grande .pieza__imagen--moneda {
      width: 66px;
      height: 66px;
    }

    .desglose--grande .pieza__badge {
      right: -14px;
      bottom: -14px;
      min-width: 2.75rem;
      padding: 0.25rem 0.625rem;
      font-size: 1.5rem;
    }

    .desglose--grande .pieza__info strong {
      font-size: 1.125rem;
    }

    .desglose--grande .pieza__info small {
      font-size: 0.8125rem;
    }

    .desglose__residuo {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin: 0.625rem 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .desglose__residuo .material-icons {
      font-size: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VueltoDesgloseComponent {
  readonly desglose = input.required<DenominacionVuelto[]>();
  readonly residuo = input<number>(0);
  /** Moneda de las piezas (la del vuelto): define símbolo, formato y catálogo de imágenes. */
  readonly moneda = input<string>('PYG');
  /** Fichas más grandes, para el diálogo de entrega del vuelto. */
  readonly grande = input<boolean>(false);

  protected readonly simbolo = computed(() => simboloMoneda(this.moneda()));
  protected readonly formato = computed(() => formatoMoneda(this.moneda()));

  protected readonly piezas = computed<PiezaVuelto[]>(() =>
    this.desglose().map((pieza) => ({
      ...pieza,
      visual: visualDenominacion(this.moneda(), pieza.valor, pieza.tipo),
    })),
  );

  /** Texto de la ficha genérica cuando aún no hay imagen: "100" para enteros, "25¢" para centavos. */
  protected textoGenerico(valor: number): string {
    if (valor >= 1) {
      return valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(Math.round(valor));
    }
    return `${Math.round(valor * 100)}¢`;
  }

  protected altDe(pieza: PiezaVuelto): string {
    const tipo = pieza.tipo === 'MONEDA' ? 'Moneda' : 'Billete';
    return `${tipo} de ${pieza.visual.etiqueta}`;
  }
}
