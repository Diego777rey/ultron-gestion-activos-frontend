import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { CajaService } from '../../../../financiero/cajas/services/caja.service';
import { MaletinService } from '../../../../financiero/maletines/services/maletin.service';
import { CajaOutput } from '../../../../financiero/cajas/interfaces/caja.interface';
import { MaletinOutput } from '../../../../financiero/maletines/interfaces/maletin.interface';
import { SesionCajaService } from '../../services/sesion-caja.service';
import {
  ConteoDenominacionInput,
  SesionCajaOutput,
} from '../../interfaces/sesion-caja.interface';

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
  imports: [ModalComponent, UiButtonComponent, DecimalPipe, EntitySearcherComponent],
  templateUrl: './abrir-caja-dialog.component.html',
  styleUrl: './abrir-caja-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbrirCajaDialogComponent {
  private readonly cajaService = inject(CajaService);
  private readonly maletinService = inject(MaletinService);
  private readonly sesionCajaService = inject(SesionCajaService);

  readonly maletinVerificado = input(false);
  readonly cajaAbierta = input(false);
  readonly initialStep = input(1);
  readonly sesionActual = input<SesionCajaOutput | null>(null);

  readonly salir = output<void>();
  readonly maletinConfirmado = output<{ idCaja: number; idMaletin: number }>();
  readonly cajaAbiertaConfirmada = output<SesionCajaOutput>();
  readonly cajaCerradaConfirmada = output<SesionCajaOutput>();

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Verificar maletín', icon: 'business_center' },
    { index: 2, label: 'Conteo de apertura', icon: 'payments' },
    { index: 3, label: 'Conteo de cierre', icon: 'account_balance_wallet' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly monedaActiva = signal<MonedaCodigo>('PYG');
  protected readonly maletinOk = signal(false);
  protected readonly cajaOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cajas = signal<CajaOutput[]>([]);
  protected readonly maletines = signal<MaletinOutput[]>([]);
  protected readonly idCajaSeleccionada = signal<number | null>(null);
  protected readonly idMaletinSeleccionado = signal<number | null>(null);
  protected readonly selectedCaja = signal<CajaOutput | null>(null);
  protected readonly selectedMaletin = signal<MaletinOutput | null>(null);
  protected readonly loadingCajas = signal(false);
  protected readonly loadingMaletines = signal(false);

  protected readonly cajaColumns: TableColumn<CajaOutput>[] = [
    { key: 'id_caja', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (c) => c.nombre ?? '' },
    { key: 'sector', header: 'Sector', value: (c) => c.sector?.nombre ?? '' },
  ];

  protected readonly maletinColumns: TableColumn<MaletinOutput>[] = [
    { key: 'id_maletin', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Código', value: (m) => m.nombre ?? '' },
    { key: 'sector', header: 'Sector', value: (m) => m.sector?.nombre ?? '' },
  ];

  protected readonly cajaLabelFn = (c: CajaOutput) => c.nombre ?? `Caja #${c.id_caja}`;
  protected readonly cajaKeyFn = (c: CajaOutput) => c.id_caja;
  protected readonly maletinLabelFn = (m: MaletinOutput) =>
    m.nombre ?? `Maletín #${m.id_maletin}`;
  protected readonly maletinKeyFn = (m: MaletinOutput) => m.id_maletin;
  protected readonly maletinSearchFn = (m: MaletinOutput, query: string): boolean =>
    (m.nombre ?? '').toLowerCase().includes(query);
  protected readonly cajaSearchFn = (c: CajaOutput, query: string): boolean =>
    (c.nombre ?? '').toLowerCase().includes(query) || String(c.id_caja).includes(query);

  protected readonly maletinDeshabilitado = computed(
    () => this.cajaOpen() || this.idCajaSeleccionada() == null
  );

  protected readonly mismoSector = computed(() =>
    this.esMismoSector(this.selectedCaja(), this.selectedMaletin())
  );

  protected readonly cajasParaBuscador = computed(() => {
    const list = this.cajas();
    const selected = this.selectedCaja();
    if (selected && !list.some((c) => c.id_caja === selected.id_caja)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly maletinesParaBuscador = computed(() => {
    const selected = this.selectedMaletin();
    const idSectorCaja = this.selectedCaja()?.sector?.id_sector;
    const list =
      idSectorCaja == null
        ? []
        : this.maletines().filter((m) => m.sector?.id_sector === idSectorCaja);
    if (selected && !list.some((m) => m.id_maletin === selected.id_maletin)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly monedasApertura = signal<MonedaConfig[]>(crearMonedasVacias());
  protected readonly monedasCierre = signal<MonedaConfig[]>(crearMonedasVacias());

  constructor() {
    this.loadCatalogos();
    queueMicrotask(() => {
      this.maletinOk.set(this.maletinVerificado());
      this.cajaOpen.set(this.cajaAbierta());
      this.currentStep.set(this.initialStep());
      const sesion = this.sesionActual();
      if (sesion?.caja) {
        this.selectedCaja.set(sesion.caja);
        this.idCajaSeleccionada.set(sesion.caja.id_caja);
      }
      if (sesion?.maletin) {
        this.selectedMaletin.set(sesion.maletin);
        this.idMaletinSeleccionado.set(sesion.maletin.id_maletin);
      }
      this.loadMaletinesDisponibles();
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

  protected readonly puedeVerificar = computed(
    () =>
      this.idCajaSeleccionada() != null &&
      this.idMaletinSeleccionado() != null &&
      this.mismoSector()
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

  protected onCajaSelected(caja: CajaOutput | null): void {
    this.selectedCaja.set(caja);
    this.idCajaSeleccionada.set(caja?.id_caja ?? null);
    this.selectedMaletin.set(null);
    this.idMaletinSeleccionado.set(null);
    this.maletinOk.set(false);
    this.error.set(null);
    this.loadMaletinesDisponibles();
  }

  protected onMaletinSelected(maletin: MaletinOutput | null): void {
    if (maletin && !this.esMismoSector(this.selectedCaja(), maletin)) {
      return;
    }
    this.selectedMaletin.set(maletin);
    this.idMaletinSeleccionado.set(maletin?.id_maletin ?? null);
    this.maletinOk.set(false);
    this.error.set(null);
  }

  protected verificarMaletin(): void {
    const idCaja = this.idCajaSeleccionada();
    const idMaletin = this.idMaletinSeleccionado();
    if (idCaja == null || idMaletin == null) {
      this.error.set('Seleccioná una caja y un maletín para continuar');
      return;
    }
    if (!this.mismoSector()) {
      this.error.set('El maletín debe ser del mismo sector que la caja');
      return;
    }
    this.error.set(null);
    this.maletinOk.set(true);
    this.maletinConfirmado.emit({ idCaja, idMaletin });
    this.monedaActiva.set('PYG');
    this.currentStep.set(2);
  }

  protected abrirCaja(): void {
    const idCaja = this.idCajaSeleccionada();
    const idMaletin = this.idMaletinSeleccionado();
    if (idCaja == null || idMaletin == null) {
      this.error.set('Seleccioná caja y maletín antes de abrir');
      this.currentStep.set(1);
      return;
    }
    if (!this.mismoSector()) {
      this.error.set('El maletín debe ser del mismo sector que la caja');
      this.currentStep.set(1);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.sesionCajaService
      .abrirCaja({
        idCaja,
        idMaletin,
        conteos: this.buildConteos(this.monedasApertura()),
      })
      .subscribe({
        next: (sesion) => {
          this.saving.set(false);
          this.cajaOpen.set(true);
          this.cajaAbiertaConfirmada.emit(sesion);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'No se pudo abrir la caja');
        },
      });
  }

  protected cerrarCaja(): void {
    const sesion = this.sesionActual();
    if (!sesion?.id_sesion_caja) {
      this.error.set('No hay una sesión abierta para cerrar');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.sesionCajaService
      .cerrarCaja({
        idSesionCaja: sesion.id_sesion_caja,
        conteos: this.buildConteos(this.monedasCierre()),
      })
      .subscribe({
        next: (cerrada) => {
          this.saving.set(false);
          this.cajaCerradaConfirmada.emit(cerrada);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'No se pudo cerrar la caja');
        },
      });
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

  private loadCatalogos(): void {
    this.fetchCajas();
  }

  private fetchCajas(): void {
    this.loadingCajas.set(true);
    this.cajaService.findDisponibles().subscribe({
      next: (items) => {
        const sesion = this.sesionActual();
        const list = items.filter((c) => c.activa !== false);
        if (sesion?.caja && !list.some((c) => c.id_caja === sesion.caja?.id_caja)) {
          this.cajas.set([sesion.caja, ...list]);
        } else {
          this.cajas.set(list);
        }
        this.loadingCajas.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las cajas');
        this.loadingCajas.set(false);
      },
    });
  }

  private loadMaletinesDisponibles(): void {
    const caja =
      this.selectedCaja() ?? this.cajas().find((c) => c.id_caja === this.idCajaSeleccionada());
    const idSector = caja?.sector?.id_sector ?? null;

    if (idSector == null) {
      this.maletines.set([]);
      this.loadingMaletines.set(false);
      return;
    }

    this.loadingMaletines.set(true);
    this.maletinService.findDisponibles(idSector).subscribe({
      next: (items) => {
        const sesion = this.sesionActual();
        if (sesion?.maletin && !items.some((m) => m.id_maletin === sesion.maletin?.id_maletin)) {
          this.maletines.set([sesion.maletin, ...items]);
        } else {
          this.maletines.set(items);
        }
        this.loadingMaletines.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los maletines');
        this.loadingMaletines.set(false);
      },
    });
  }

  private buildConteos(monedas: MonedaConfig[]): ConteoDenominacionInput[] {
    const conteos: ConteoDenominacionInput[] = [];
    for (const moneda of monedas) {
      for (const d of moneda.denominaciones) {
        if (d.cantidad > 0) {
          conteos.push({
            moneda: moneda.codigo,
            valorDenominacion: d.valor,
            cantidad: d.cantidad,
          });
        }
      }
    }
    if (conteos.length === 0) {
      conteos.push({ moneda: 'PYG', valorDenominacion: 1000, cantidad: 0 });
    }
    return conteos;
  }

  private actualizarMonedas(updater: (lista: MonedaConfig[]) => MonedaConfig[]): void {
    if (this.tipoConteoActivo() === 'cierre') {
      this.monedasCierre.update(updater);
      return;
    }
    this.monedasApertura.update(updater);
  }

  private esMismoSector(caja: CajaOutput | null, maletin: MaletinOutput | null): boolean {
    const idSectorCaja = caja?.sector?.id_sector;
    const idSectorMaletin = maletin?.sector?.id_sector;
    return (
      idSectorCaja != null &&
      idSectorMaletin != null &&
      idSectorCaja === idSectorMaletin
    );
  }
}
