import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe, formatNumber } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, tap } from 'rxjs/operators';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { CartItem, FormaPago } from '../../interfaces/venta.interface';
import { VueltoCalculado } from '../../interfaces/vuelto.interface';
import { CotizacionService } from '../../../../financiero/cotizaciones/services/cotizacion.service';
import { MontoCotizado } from '../../../../financiero/cotizaciones/interfaces/cotizacion.interface';
import { VueltoService } from '../../services/vuelto.service';
import { VueltoDesgloseComponent } from '../../components/vuelto-desglose/vuelto-desglose.component';
import {
  MONEDA_GUARANI,
  codigoMoneda,
  esGuarani,
  formatoMoneda,
  simboloMoneda,
} from '../../models/monedas';

interface MetodoPago {
  codigo: FormaPago;
  label: string;
  icon: string;
  descripcion: string;
}

export interface PagoConfirmado {
  formaPago: FormaPago;
  /** Moneda en la que paga el cliente. */
  moneda: string;
  /** Efectivo entregado por el cliente, en `moneda`. Solo para EFECTIVO. */
  montoRecibido?: number;
  /** Moneda en la que el cajero entrega el vuelto. */
  monedaVuelto?: string;
  /** Vuelto calculado por el backend para ese monto; se usa para mostrarlo tras cobrar. */
  vuelto?: VueltoCalculado;
}

/** Lo que se le pide al backend: monto en la moneda recibida y en qué moneda se devuelve. */
interface ConsultaVuelto {
  monto: number | null;
  monedaRecibida: string;
  monedaVuelto: string;
}

/** Espera tras la última tecla antes de pedir el vuelto al backend. */
const VUELTO_DEBOUNCE_MS = 200;

@Component({
  selector: 'app-pago-dialog',
  imports: [ModalComponent, UiButtonComponent, DecimalPipe, VueltoDesgloseComponent],
  template: `
    <app-modal
      [open]="true"
      title="Cobrar venta"
      subtitle="Revisá el carrito y elegí cómo se realiza el cobro"
      maxWidth="1080px"
      headerVariant="primary"
      [closeOnBackdrop]="true"
      (closed)="onCancelar()"
    >
      <div class="pago">
        <aside class="carrito" aria-labelledby="carrito-titulo">
          <header class="carrito__header">
            <h3 id="carrito-titulo">Carrito</h3>
            <span class="carrito__badge">{{ cantidadItems() }} {{ cantidadItems() === 1 ? 'ítem' : 'ítems' }}</span>
          </header>
          <ul class="carrito__lista">
            @for (item of items(); track $index) {
              <li class="carrito__item">
                <span class="carrito__icono material-icons" aria-hidden="true">{{ iconoItem(item) }}</span>
                <div class="carrito__info">
                  <strong>{{ item.nombre }}</strong>
                  <small>
                    @if (item.presentacion) {
                      {{ item.presentacion }} ·
                    }
                    {{ item.cantidad | number: '1.0-2' }} × Gs. {{ item.precioUnitario | number: '1.0-0' }}
                  </small>
                </div>
                <span class="carrito__subtotal">Gs. {{ item.cantidad * item.precioUnitario | number: '1.0-0' }}</span>
              </li>
            } @empty {
              <li class="carrito__vacio">El carrito está vacío</li>
            }
          </ul>
          <footer class="carrito__total">
            <span>Total a cobrar</span>
            <strong>
              @if (pagaEnGuaranies()) {
                Gs. {{ total() | number: '1.0-0' }}
              } @else {
                {{ simbolo() }} {{ montoDe(monedaSeleccionada()) | number: '1.2-2' }}
              }
            </strong>
            @if (!pagaEnGuaranies()) {
              <small>Equivale a Gs. {{ total() | number: '1.0-0' }}</small>
            }
          </footer>
        </aside>

        <section class="cobro">
          <div class="bloque">
            <div class="bloque__titulo">
              <label class="pago__label">Moneda</label>
              @if (cargandoMontos()) {
                <small>Calculando montos...</small>
              } @else if (errorMontos()) {
                <small>{{ errorMontos() }}</small>
              } @else if (cotizacionActual()) {
                <small>1 {{ monedaSeleccionada() }} = {{ cotizacionActual()!.valorCotizacion | number: '1.0-0' }} Gs.</small>
              }
            </div>
            <div class="fila" role="radiogroup" aria-label="Seleccionar moneda">
              @for (moneda of monedasDisponibles(); track moneda.codigo) {
                <button
                  type="button"
                  class="opcion"
                  [class.opcion--selected]="monedaSeleccionada() === moneda.codigo"
                  role="radio"
                  [attr.aria-checked]="monedaSeleccionada() === moneda.codigo"
                  (click)="seleccionarMoneda(moneda.codigo)"
                >
                  <strong>{{ moneda.simbolo }}</strong>
                  <small>{{ montoDe(moneda.codigo) | number: moneda.formato }}</small>
                </button>
              }
            </div>
          </div>

          <div class="bloque">
            <label class="pago__label">Método de pago</label>
            <div class="fila" role="radiogroup" aria-label="Métodos de pago">
              @for (metodo of metodosPago; track metodo.codigo) {
                <button
                  type="button"
                  class="opcion opcion--metodo"
                  role="radio"
                  [class.opcion--selected]="seleccionado() === metodo.codigo"
                  [attr.aria-checked]="seleccionado() === metodo.codigo"
                  (click)="seleccionar(metodo.codigo)"
                >
                  <span class="opcion__icono material-icons" aria-hidden="true">{{ metodo.icon }}</span>
                  <strong>{{ metodo.label }}</strong>
                  @if (seleccionado() === metodo.codigo) {
                    <span class="opcion__check material-icons" aria-hidden="true">check_circle</span>
                  }
                </button>
              }
            </div>
          </div>

          @if (requiereEfectivo()) {
            <div class="bloque efectivo" aria-labelledby="efectivo-label">
              <label id="efectivo-label" class="pago__label" for="monto-recibido">¿Con cuánto paga el cliente?</label>
              <div class="efectivo__campo">
                <span class="efectivo__prefijo" aria-hidden="true">{{ simbolo() }}</span>
                <input
                  #montoInput
                  id="monto-recibido"
                  class="efectivo__input"
                  type="text"
                  [attr.inputmode]="pagaEnGuaranies() ? 'numeric' : 'decimal'"
                  autocomplete="off"
                  [placeholder]="pagaEnGuaranies() ? '0' : '0.00'"
                  [value]="montoRecibidoTexto()"
                  (input)="onMontoInput($event)"
                  (keydown.enter)="onEnterMonto($event)"
                />
                @if (recibidoEnGs(); as gs) {
                  <span class="efectivo__equivalente">= Gs. {{ gs | number: '1.0-0' }}</span>
                }
              </div>

              @if (sugerencias().length > 0) {
                <div class="chips" role="group" aria-label="Montos frecuentes">
                  @for (monto of sugerencias(); track monto; let first = $first) {
                    <button
                      type="button"
                      class="chip"
                      [class.chip--selected]="montoRecibido() === monto"
                      (click)="usarSugerencia(monto)"
                    >
                      @if (first) {
                        <small>Exacto</small>
                      }
                      {{ simbolo() }} {{ monto | number: formato() }}
                    </button>
                  }
                </div>
              }

              @if (montoRecibido() === null) {
                <p class="efectivo__hint">Ingresá el efectivo recibido o tocá un monto frecuente.</p>
              } @else if (errorVuelto()) {
                <div class="resultado resultado--falta" role="alert">
                  <span class="material-icons" aria-hidden="true">error</span>
                  <div class="resultado__texto"><strong>{{ errorVuelto() }}</strong></div>
                </div>
              } @else if (vueltoMostrado(); as v) {
                @if (!v.suficiente) {
                  <div class="resultado resultado--falta" role="status">
                    <span class="material-icons" aria-hidden="true">error</span>
                    <div class="resultado__texto">
                      <strong>Falta {{ simbolo() }} {{ v.faltante | number: formato() }}</strong>
                      <small>El efectivo recibido no cubre el total.</small>
                    </div>
                  </div>
                } @else if (v.vueltoPyg === 0) {
                  <div class="resultado resultado--exacto" role="status">
                    <span class="material-icons" aria-hidden="true">check_circle</span>
                    <div class="resultado__texto">
                      <strong>Pago exacto</strong>
                      <small>No hay vuelto que entregar.</small>
                    </div>
                  </div>
                } @else {
                  <div
                    class="resultado resultado--vuelto"
                    [class.resultado--recalculando]="!vueltoVigente()"
                    role="status"
                    [attr.aria-busy]="!vueltoVigente()"
                  >
                    <div class="resultado__cabecera">
                      <div class="resultado__texto">
                        <span>Vuelto a entregar</span>
                        @if (monedasDisponibles().length > 1) {
                          <div class="monedas-vuelto" role="radiogroup" aria-label="Moneda del vuelto">
                            @for (moneda of monedasDisponibles(); track moneda.codigo) {
                              <button
                                type="button"
                                class="chip chip--mini"
                                role="radio"
                                [class.chip--selected]="monedaVuelto() === moneda.codigo"
                                [attr.aria-checked]="monedaVuelto() === moneda.codigo"
                                (click)="seleccionarMonedaVuelto(moneda.codigo)"
                              >
                                {{ moneda.simbolo }}
                              </button>
                            }
                          </div>
                        }
                      </div>
                      <div class="resultado__monto">
                        <strong>{{ simboloVuelto() }} {{ v.vuelto | number: formatoVuelto() }}</strong>
                        @if (v.cotizacionVuelto !== null) {
                          <small>= Gs. {{ v.vueltoPyg | number: '1.0-0' }}</small>
                        }
                      </div>
                    </div>
                    @if (v.desgloseDisponible) {
                      <app-vuelto-desglose [desglose]="v.desglose" [residuo]="v.residuo" [moneda]="v.monedaVuelto" />
                    } @else {
                      <small class="resultado__nota">Sin catálogo de billetes para esta moneda; entregá el importe indicado.</small>
                    }
                  </div>
                }
              } @else {
                <p class="efectivo__hint">Calculando vuelto…</p>
              }
            </div>
          }
        </section>

        <footer class="pago__footer">
          <app-ui-button label="Cancelar" icon="close" variant="ghost" (clicked)="onCancelar()" />
          <app-ui-button
            [label]="botonLabel()"
            icon="payments"
            variant="primary"
            [disabled]="!puedeConfirmar()"
            (clicked)="onConfirmar()"
          />
        </footer>
      </div>
    </app-modal>
  `,
  styles: `
    .pago {
      display: grid;
      grid-template-columns: minmax(300px, 5fr) minmax(0, 7fr);
      gap: 1.25rem 1.5rem;
      padding: 1.25rem 1.5rem 1.5rem;
    }

    .carrito {
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      overflow: hidden;
    }

    .carrito__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-strong);
    }

    .carrito__header h3 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .carrito__badge {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .carrito__lista {
      flex: 1;
      list-style: none;
      margin: 0;
      padding: 0.25rem 0;
      overflow-y: auto;
      max-height: 46vh;
    }

    .carrito__item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 1rem;
    }

    .carrito__item + .carrito__item {
      border-top: 1px solid var(--border-color);
    }

    .carrito__icono {
      font-size: 20px;
      color: var(--text-muted);
    }

    .carrito__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .carrito__info strong {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .carrito__info small,
    .carrito__vacio {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .carrito__vacio {
      padding: 1rem;
      text-align: center;
    }

    .carrito__subtotal {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .carrito__total {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.25rem 0.75rem;
      padding: 0.875rem 1rem;
      border-top: 1px solid var(--border-strong);
      background: var(--surface-color);
    }

    .carrito__total span {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .carrito__total strong {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .carrito__total small {
      flex-basis: 100%;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .cobro {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }

    .bloque {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bloque__titulo {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .bloque__titulo small {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .pago__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .fila {
      display: flex;
      gap: 0.5rem;
    }

    .opcion {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font: inherit;
      cursor: pointer;
    }

    .opcion strong {
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .opcion small {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .opcion--metodo {
      flex-direction: row;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .opcion__icono {
      font-size: 22px;
      color: var(--text-secondary);
    }

    .opcion--selected .opcion__icono,
    .opcion__check {
      color: var(--primary-color);
    }

    .opcion__check {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 16px;
    }

    .opcion:hover,
    .chip:hover {
      border-color: var(--border-strong-hover);
      background: var(--surface-raised-hover);
    }

    .opcion--selected,
    .opcion--selected:hover,
    .chip--selected {
      border-color: var(--primary-color);
      background: var(--active-bg);
    }

    .efectivo__campo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
    }

    .efectivo__campo:focus-within {
      border-color: var(--primary-color);
    }

    .efectivo__prefijo {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .efectivo__equivalente {
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--text-secondary);
    }

    .efectivo__input {
      flex: 1;
      min-width: 0;
      padding: 0.625rem 0;
      background: transparent;
      border: none;
      outline: none;
      font: inherit;
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chip {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      color: var(--text-primary);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
    }

    .chip small {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .chip--mini {
      padding: 0.125rem 0.625rem;
      font-size: 0.75rem;
    }

    .monedas-vuelto {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .efectivo__hint {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .resultado {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border-strong);
      background: var(--surface-raised);
    }

    .resultado__texto {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .resultado small {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .resultado--falta {
      border-color: var(--danger-border);
      background: var(--danger-bg);
    }

    .resultado--falta .material-icons,
    .resultado--falta strong {
      color: var(--danger-color);
    }

    .resultado--exacto {
      border-color: var(--success-color);
      background: var(--success-bg);
    }

    .resultado--exacto .material-icons,
    .resultado--exacto strong {
      color: var(--success-color);
    }

    .resultado--vuelto {
      flex-direction: column;
      align-items: stretch;
      border-color: var(--primary-color);
      background: var(--active-bg);
    }

    .resultado--recalculando > :not(.resultado__cabecera),
    .resultado--recalculando .resultado__monto {
      opacity: 0.45;
      transition: opacity 0.15s;
    }

    .resultado__cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .resultado__cabecera .resultado__texto {
      gap: 0.375rem;
    }

    .resultado__cabecera span {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .resultado__monto {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }

    .resultado__monto strong {
      font-size: 1.625rem;
      font-weight: 800;
      line-height: 1.1;
      color: var(--text-primary);
    }

    .resultado__nota {
      color: var(--text-secondary);
    }

    .pago__footer {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 860px) {
      .pago {
        grid-template-columns: 1fr;
      }

      .carrito__lista {
        max-height: 24vh;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagoDialogComponent implements OnInit {
  private readonly cotizacionService = inject(CotizacionService);
  private readonly vueltoService = inject(VueltoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  readonly total = input.required<number>();
  /** Ítems del carrito que se están cobrando; se muestran como resumen a la izquierda. */
  readonly items = input<CartItem[]>([]);
  /** Método que queda preseleccionado al abrir (p. ej. EFECTIVO desde "Cobrar efectivo"). */
  readonly metodoInicial = input<FormaPago | null>(null);

  readonly cancelar = output<void>();
  readonly confirmar = output<PagoConfirmado>();

  private readonly montoInput = viewChild<ElementRef<HTMLInputElement>>('montoInput');
  private readonly consulta$ = new Subject<ConsultaVuelto>();

  protected readonly seleccionado = signal<FormaPago | null>(null);
  /** Moneda en la que paga el cliente (la de la venta). */
  protected readonly monedaSeleccionada = signal<string>(MONEDA_GUARANI);
  /** Moneda en la que el cajero entrega el vuelto. */
  protected readonly monedaVuelto = signal<string>(MONEDA_GUARANI);
  protected readonly montos = signal<MontoCotizado[]>([]);
  protected readonly cargandoMontos = signal(true);
  protected readonly errorMontos = signal<string | null>(null);

  protected readonly montoRecibidoTexto = signal('');
  protected readonly sugerencias = signal<number[]>([]);
  protected readonly vuelto = signal<VueltoCalculado | null>(null);
  protected readonly errorVuelto = signal<string | null>(null);

  protected readonly pagaEnGuaranies = computed(() => esGuarani(this.monedaSeleccionada()));
  protected readonly simbolo = computed(() => simboloMoneda(this.monedaSeleccionada()));
  protected readonly formato = computed(() => formatoMoneda(this.monedaSeleccionada()));
  protected readonly simboloVuelto = computed(() => simboloMoneda(this.monedaVuelto()));
  protected readonly formatoVuelto = computed(() => formatoMoneda(this.monedaVuelto()));

  protected readonly montoRecibido = computed(() =>
    parsearMonto(this.montoRecibidoTexto(), this.pagaEnGuaranies() ? 0 : 2),
  );

  protected readonly cantidadItems = computed(() =>
    this.items().reduce((acc, item) => acc + item.cantidad, 0),
  );

  /** El vuelto aplica a cualquier cobro en efectivo, en la moneda que sea. */
  protected readonly requiereEfectivo = computed(() => this.seleccionado() === 'EFECTIVO');

  /** El vuelto mostrado corresponde al monto tipeado y a las monedas elegidas (no a una consulta anterior en vuelo). */
  protected readonly vueltoVigente = computed(() => {
    const monto = this.montoRecibido();
    const calculo = this.vuelto();
    if (monto === null || !calculo || calculo.montoRecibido !== monto) {
      return null;
    }
    const mismaRecibida = codigoMoneda(calculo.monedaRecibida) === codigoMoneda(this.monedaSeleccionada());
    const mismoVuelto = codigoMoneda(calculo.monedaVuelto) === codigoMoneda(this.monedaVuelto());
    return mismaRecibida && mismoVuelto ? calculo : null;
  });

  /**
   * Lo que se dibuja: el cálculo vigente o, mientras se recalcula por un cambio de
   * moneda del vuelto, el último cálculo del mismo monto (atenuado) para que el bloque
   * y el selector de moneda no desaparezcan.
   */
  protected readonly vueltoMostrado = computed(() => {
    const vigente = this.vueltoVigente();
    if (vigente) return vigente;
    const monto = this.montoRecibido();
    const calculo = this.vuelto();
    if (monto === null || !calculo || calculo.montoRecibido !== monto || !calculo.suficiente) {
      return null;
    }
    const mismaRecibida = codigoMoneda(calculo.monedaRecibida) === codigoMoneda(this.monedaSeleccionada());
    return mismaRecibida && calculo.vueltoPyg > 0 ? calculo : null;
  });

  /** Equivalente en guaraníes de lo tipeado, cuando el cliente paga en otra moneda. */
  protected readonly recibidoEnGs = computed(() => {
    if (this.pagaEnGuaranies()) return null;
    return this.vueltoVigente()?.montoRecibidoPyg ?? null;
  });

  protected readonly puedeConfirmar = computed(() => {
    if (!this.seleccionado() || this.cargandoMontos() || this.errorMontos()) {
      return false;
    }
    if (!this.requiereEfectivo()) {
      return true;
    }
    return this.vueltoVigente()?.suficiente === true;
  });

  protected readonly cotizacionActual = computed(() => {
    const moneda = this.monedaSeleccionada();
    if (esGuarani(moneda)) return null;
    return this.montos().find((item) => item.moneda === moneda) ?? null;
  });

  protected readonly monedasDisponibles = computed(() =>
    this.montos().map((monto) => ({
      codigo: monto.moneda,
      simbolo: simboloMoneda(monto.moneda),
      formato: formatoMoneda(monto.moneda),
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
    if (this.requiereEfectivo()) {
      const calculo = this.vueltoVigente();
      if (calculo?.suficiente && calculo.vueltoPyg > 0) {
        return 'Cobrar y dar vuelto';
      }
    }
    const found = this.metodosPago.find((m) => m.codigo === metodo);
    return `Cobrar con ${found?.label ?? 'método'}`;
  });

  constructor() {
    this.consulta$
      .pipe(
        tap(() => this.errorVuelto.set(null)),
        debounceTime(VUELTO_DEBOUNCE_MS),
        switchMap(({ monto, monedaRecibida, monedaVuelto }) =>
          this.vueltoService.calcular(Number(this.total()), monto, monedaRecibida, monedaVuelto).pipe(
            catchError((err: Error) => {
              this.errorVuelto.set(err.message || 'No se pudo calcular el vuelto');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((calculo) => {
        this.vuelto.set(calculo);
        if (calculo) {
          this.sugerencias.set(calculo.montosSugeridos);
        }
      });

    effect(() => {
      const input = this.montoInput();
      if (input && this.requiereEfectivo()) {
        input.nativeElement.focus();
      }
    });
  }

  ngOnInit(): void {
    const total = Number(this.total());
    const inicial = this.metodoInicial();
    if (inicial) {
      this.seleccionado.set(inicial);
    }
    this.cotizacionService.cotizarTotal(total).subscribe({
      next: (montos) => {
        this.montos.set(montos);
        this.cargandoMontos.set(false);
      },
      error: (err: Error) => {
        this.errorMontos.set(err.message || 'No se pudieron calcular los montos');
        this.cargandoMontos.set(false);
      },
    });
    this.consultar(null);
  }

  protected seleccionar(codigo: FormaPago): void {
    this.seleccionado.set(codigo);
  }

  protected iconoItem(item: CartItem): string {
    switch (item.tipo) {
      case 'SERVICIO':
        return 'handyman';
      case 'ORDEN':
        return 'assignment_turned_in';
      default:
        return 'inventory_2';
    }
  }

  /** Cambiar la moneda en la que paga el cliente invalida el monto tipeado (estaba en otra moneda). */
  protected seleccionarMoneda(codigo: string): void {
    if (codigo === this.monedaSeleccionada()) return;
    this.monedaSeleccionada.set(codigo);
    this.montoRecibidoTexto.set('');
    this.vuelto.set(null);
    this.sugerencias.set([]);
    this.consultar(null);
    this.montoInput()?.nativeElement.focus();
  }

  protected seleccionarMonedaVuelto(codigo: string): void {
    if (codigo === this.monedaVuelto()) return;
    this.monedaVuelto.set(codigo);
    this.consultar(this.montoRecibido());
  }

  protected onMontoInput(event: Event): void {
    const texto = (event.target as HTMLInputElement).value;
    if (this.pagaEnGuaranies()) {
      this.actualizarMonto(parsearMonto(texto, 0));
    } else {
      // En moneda extranjera no se reformatea mientras se tipea, para no pelear con los decimales.
      this.montoRecibidoTexto.set(texto);
      this.consultar(parsearMonto(texto, 2));
    }
  }

  protected usarSugerencia(monto: number): void {
    this.actualizarMonto(monto);
    this.montoInput()?.nativeElement.focus();
  }

  protected onEnterMonto(event: Event): void {
    event.preventDefault();
    if (this.puedeConfirmar()) {
      this.onConfirmar();
    }
  }

  protected onCancelar(): void {
    this.cancelar.emit();
  }

  protected onConfirmar(): void {
    const metodo = this.seleccionado();
    if (!metodo || !this.puedeConfirmar()) {
      return;
    }
    const pago: PagoConfirmado = {
      formaPago: metodo,
      moneda: this.monedaSeleccionada(),
    };
    if (this.requiereEfectivo()) {
      const calculo = this.vueltoVigente();
      if (!calculo?.suficiente || calculo.montoRecibido === null) {
        return;
      }
      pago.montoRecibido = calculo.montoRecibido;
      pago.monedaVuelto = this.monedaVuelto();
      pago.vuelto = calculo;
    }
    this.confirmar.emit(pago);
  }

  protected montoDe(codigo: string): number | string | null {
    return this.montos().find((item) => item.moneda === codigo)?.monto ?? null;
  }

  /** Mismo formato que el resto de la app (`DecimalPipe` con el `LOCALE_ID` vigente). */
  private actualizarMonto(monto: number | null): void {
    this.montoRecibidoTexto.set(monto === null ? '' : formatNumber(monto, this.locale, this.formato()));
    this.consultar(monto);
  }

  private consultar(monto: number | null): void {
    this.consulta$.next({
      monto,
      monedaRecibida: this.monedaSeleccionada(),
      monedaVuelto: this.monedaVuelto(),
    });
  }
}

/**
 * Convierte lo tipeado en número con hasta `decimales` decimales.
 * Sin decimales (guaraníes) toma solo los dígitos: "1.250.000" o "1,250,000" → 1250000.
 * Con decimales acepta "," o "." como separador decimal (el último que aparece) y
 * descarta los separadores de miles: "77,53" → 77.53, "1,000.50" → 1000.5, "1.000" → 1000.
 * Texto sin dígitos → null.
 */
export function parsearMonto(texto: string, decimales: number): number | null {
  const limpio = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(limpio)) {
    return null;
  }
  if (decimales === 0) {
    return Number(limpio.replace(/\D/g, ''));
  }
  const ultimoSeparador = Math.max(limpio.lastIndexOf('.'), limpio.lastIndexOf(','));
  let entero = limpio;
  let fraccion = '';
  if (ultimoSeparador >= 0) {
    const despues = limpio.slice(ultimoSeparador + 1);
    if (despues.length <= decimales) {
      entero = limpio.slice(0, ultimoSeparador);
      fraccion = despues;
    }
  }
  const valor = Number(`${entero.replace(/\D/g, '') || '0'}.${fraccion || '0'}`);
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
