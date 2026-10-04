import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  effect,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { CartItem, FormaPago } from '../../interfaces/venta.interface';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { CotizacionService } from '../../../../financiero/cotizaciones/services/cotizacion.service';
import { MontoCotizado } from '../../../../financiero/cotizaciones/interfaces/cotizacion.interface';

export interface FacturaConfirmada {
  idCliente: number;
  formaPago: FormaPago;
  moneda: string;
}

@Component({
  selector: 'app-factura-dialog',
  imports: [
    ModalComponent,
    UiButtonComponent,
    DecimalPipe,
    FormsModule,
    ClienteFormComponent,
  ],
  templateUrl: './factura-dialog.component.html',
  styleUrl: './factura-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaDialogComponent implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly cotizacionService = inject(CotizacionService);
  private readonly loading = inject(LoadingService);

  readonly cart = input.required<CartItem[]>();
  readonly total = input.required<number>();

  readonly cancelar = output<void>();
  readonly confirmar = output<FacturaConfirmada>();

  protected readonly clienteSeleccionado = signal<ClienteOutput | null>(null);
  protected readonly busqueda = signal('');
  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly loadingClientes = signal(false);
  protected readonly mostrarFormularioCliente = signal(false);
  protected readonly seleccionado = signal<FormaPago>('EFECTIVO');
  protected readonly monedaSeleccionada = signal<string>('PYG');
  protected readonly montos = signal<MontoCotizado[]>([]);
  protected readonly cargandoMontos = signal(true);
  protected readonly errorMontos = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly clientesFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const items = this.clientes();
    if (!q) {
      return items;
    }
    return items.filter((c) => {
      const nombre = `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.toLowerCase();
      const doc = c.persona?.documento?.toLowerCase() ?? '';
      const ruc = c.ruc?.toLowerCase() ?? '';
      return nombre.includes(q) || doc.includes(q) || ruc.includes(q);
    });
  });

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

  protected readonly metodosPago = [
    {
      codigo: 'EFECTIVO' as FormaPago,
      label: 'Efectivo',
      icon: 'payments',
    },
    {
      codigo: 'TARJETA' as FormaPago,
      label: 'Tarjeta',
      icon: 'credit_card',
    },
    {
      codigo: 'TRANSFERENCIA' as FormaPago,
      label: 'Transferencia',
      icon: 'account_balance',
    },
  ];

  protected readonly botonLabel = computed(() =>
    this.clienteSeleccionado() ? 'Cobrar e imprimir factura' : 'Seleccioná un cliente',
  );

  protected readonly puedeConfirmar = computed(() => {
    return !!this.clienteSeleccionado() && !!this.seleccionado();
  });

  constructor() {
    effect(() => {
      if (!this.mostrarFormularioCliente()) {
        this.cargarClientes();
      }
    });
  }

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

  protected montoDe(codigo: string): number | string | null {
    return this.montos().find((item) => item.moneda === codigo)?.monto ?? null;
  }

  protected nombreCliente(cliente: ClienteOutput): string {
    return nombreCompletoPersona(cliente.persona) || 'Sin nombre';
  }

  protected seleccionarCliente(cliente: ClienteOutput): void {
    this.clienteSeleccionado.set(cliente);
    this.error.set(null);
  }

  protected seleccionar(codigo: FormaPago): void {
    this.seleccionado.set(codigo);
  }

  protected seleccionarMoneda(codigo: string): void {
    this.monedaSeleccionada.set(codigo);
  }

  protected onBusquedaChange(value: string): void {
    this.busqueda.set(value);
  }

  protected abrirFormularioCliente(): void {
    this.mostrarFormularioCliente.set(true);
  }

  protected cerrarFormularioCliente(): void {
    this.mostrarFormularioCliente.set(false);
    this.cargarClientes();
  }

  protected onClienteGuardado(): void {
    this.mostrarFormularioCliente.set(false);
    this.cargarClientes();
  }

  protected onCancelar(): void {
    this.cancelar.emit();
  }

  protected onConfirmar(): void {
    const cliente = this.clienteSeleccionado();
    const metodo = this.seleccionado();

    if (!cliente?.id_cliente) {
      this.error.set('Seleccioná un cliente para continuar');
      return;
    }

    if (!metodo) {
      this.error.set('Seleccioná una forma de pago');
      return;
    }

    this.confirmar.emit({
      idCliente: Number(cliente.id_cliente),
      formaPago: metodo,
      moneda: this.monedaSeleccionada(),
    });
  }

  private cargarClientes(): void {
    this.loadingClientes.set(true);
    this.loading
      .track(this.clienteService.findAll(), {
        errorTitle: 'No se pudo cargar la lista de clientes',
        notifyError: false,
      })
      .subscribe({
        next: (items) => {
          this.clientes.set(items.filter((c) => c.estado !== false));
          this.loadingClientes.set(false);
        },
        error: () => {
          this.loadingClientes.set(false);
          this.error.set('No se pudieron cargar los clientes');
        },
      });
  }

  private simboloMoneda(moneda: string): string {
    const simbolos: Record<string, string> = {
      PYG: 'Gs.',
      USD: 'US$',
      BRL: 'R$',
      ARS: '$',
      EUR: '€',
    };
    return simbolos[moneda] || moneda;
  }
}
