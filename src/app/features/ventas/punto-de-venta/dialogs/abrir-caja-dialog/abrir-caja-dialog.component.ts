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

type MonedaCodigo = 'PYG' | 'BRL' | 'USD';
type TipoConteo = 'apertura' | 'cierre';

interface StepDef {
  index: number;
  label: string;
  icon: string;
}

interface Denominacion {
  valor: number;
  cantidad: number;
}

interface MonedaConfig {
  codigo: MonedaCodigo;
  label: string;
  simbolo: string;
  icon: string;
  denominaciones: Denominacion[];
}

function crearMonedasVacias(): MonedaConfig[] {
  return [
    {
      codigo: 'PYG',
      label: 'Guaraní',
      simbolo: 'Gs.',
      icon: 'payments',
      denominaciones: [1000, 2000, 5000, 10000, 20000, 50000, 100000].map((valor) => ({
        valor,
        cantidad: 0,
      })),
    },
    {
      codigo: 'BRL',
      label: 'Real',
      simbolo: 'R$',
      icon: 'currency_exchange',
      denominaciones: [1, 2, 5, 10, 20, 50, 100, 200].map((valor) => ({
        valor,
        cantidad: 0,
      })),
    },
    {
      codigo: 'USD',
      label: 'Dólar',
      simbolo: 'US$',
      icon: 'attach_money',
      denominaciones: [1, 2, 5, 10, 20, 50, 100].map((valor) => ({
        valor,
        cantidad: 0,
      })),
    },
  ];
}

@Component({
  selector: 'app-abrir-caja-dialog',
  imports: [ModalComponent, UiButtonComponent, DecimalPipe],
  templateUrl: './abrir-caja-dialog.component.html',
  styleUrl: './abrir-caja-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbrirCajaDialogComponent {
  /** Si el maletín ya fue verificado en esta sesión. */
  readonly maletinVerificado = input(false);
  /** Si la caja ya fue abierta tras el conteo de apertura. */
  readonly cajaAbierta = input(false);
  /** Paso inicial al abrir el diálogo. */
  readonly initialStep = input(1);

  readonly salir = output<void>();
  readonly maletinConfirmado = output<void>();
  readonly cajaAbiertaConfirmada = output<void>();
  readonly cajaCerradaConfirmada = output<void>();

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Verificar maletín', icon: 'business_center' },
    { index: 2, label: 'Conteo de apertura', icon: 'payments' },
    { index: 3, label: 'Conteo de cierre', icon: 'account_balance_wallet' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly monedaActiva = signal<MonedaCodigo>('PYG');
  protected readonly maletinOk = signal(false);
  protected readonly cajaOpen = signal(false);

  protected readonly monedasApertura = signal<MonedaConfig[]>(crearMonedasVacias());
  protected readonly monedasCierre = signal<MonedaConfig[]>(crearMonedasVacias());

  constructor() {
    // Estado inicial sincronizado con el padre al crear el diálogo.
    queueMicrotask(() => {
      this.maletinOk.set(this.maletinVerificado());
      this.cajaOpen.set(this.cajaAbierta());
      this.currentStep.set(this.initialStep());
    });
  }

  protected readonly tituloPaso = computed(() => {
    switch (this.currentStep()) {
      case 1:
        return 'Verificar maletín';
      case 2:
        return 'Conteo de apertura de caja';
      default:
        return 'Conteo de cierre de caja';
    }
  });

  protected readonly tipoConteoActivo = computed<TipoConteo | null>(() => {
    if (this.currentStep() === 2) {
      return 'apertura';
    }
    if (this.currentStep() === 3) {
      return 'cierre';
    }
    return null;
  });

  protected readonly monedas = computed(() => {
    if (this.tipoConteoActivo() === 'cierre') {
      return this.monedasCierre();
    }
    return this.monedasApertura();
  });

  protected readonly monedaSeleccionada = computed(() => {
    const codigo = this.monedaActiva();
    return this.monedas().find((m) => m.codigo === codigo)!;
  });

  protected readonly totalMonedaActiva = computed(() =>
    this.monedaSeleccionada().denominaciones.reduce(
      (acc, d) => acc + d.valor * d.cantidad,
      0
    )
  );

  protected readonly totalesPorMoneda = computed(() =>
    this.monedas().map((moneda) => ({
      codigo: moneda.codigo,
      label: moneda.label,
      simbolo: moneda.simbolo,
      total: moneda.denominaciones.reduce((acc, d) => acc + d.valor * d.cantidad, 0),
    }))
  );

  protected isStepEnabled(stepIndex: number): boolean {
    if (stepIndex === 1) {
      return true;
    }
    return this.maletinOk();
  }

  protected isStepDone(stepIndex: number): boolean {
    if (stepIndex === 1) {
      return this.maletinOk();
    }
    if (stepIndex === 2) {
      return this.cajaOpen();
    }
    return false;
  }

  protected irAPaso(stepIndex: number): void {
    if (!this.isStepEnabled(stepIndex)) {
      return;
    }
    this.monedaActiva.set('PYG');
    this.currentStep.set(stepIndex);
  }

  protected seleccionarMoneda(codigo: MonedaCodigo): void {
    this.monedaActiva.set(codigo);
  }

  protected verificarMaletin(): void {
    this.maletinOk.set(true);
    this.maletinConfirmado.emit();
    this.monedaActiva.set('PYG');
    this.currentStep.set(2);
  }

  protected abrirCaja(): void {
    this.cajaOpen.set(true);
    this.cajaAbiertaConfirmada.emit();
  }

  protected cerrarCaja(): void {
    this.cajaCerradaConfirmada.emit();
  }

  protected onSalir(): void {
    this.salir.emit();
  }

  protected ajustarCantidad(valor: number, delta: number): void {
    this.actualizarMonedas((lista) =>
      lista.map((moneda) => {
        if (moneda.codigo !== this.monedaActiva()) {
          return moneda;
        }
        return {
          ...moneda,
          denominaciones: moneda.denominaciones.map((d) => {
            if (d.valor !== valor) {
              return d;
            }
            return { ...d, cantidad: Math.max(0, d.cantidad + delta) };
          }),
        };
      })
    );
  }

  protected setCantidad(valor: number, raw: string): void {
    const parsed = Number.parseInt(raw, 10);
    const cantidad = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

    this.actualizarMonedas((lista) =>
      lista.map((moneda) => {
        if (moneda.codigo !== this.monedaActiva()) {
          return moneda;
        }
        return {
          ...moneda,
          denominaciones: moneda.denominaciones.map((d) =>
            d.valor === valor ? { ...d, cantidad } : d
          ),
        };
      })
    );
  }

  protected lineTotal(valor: number, cantidad: number): number {
    return valor * cantidad;
  }

  protected formatDenominacion(moneda: MonedaConfig, valor: number): string {
    return `${moneda.simbolo} ${valor.toLocaleString('es-PY')}`;
  }

  private actualizarMonedas(updater: (lista: MonedaConfig[]) => MonedaConfig[]): void {
    if (this.tipoConteoActivo() === 'cierre') {
      this.monedasCierre.update(updater);
      return;
    }
    this.monedasApertura.update(updater);
  }
}
