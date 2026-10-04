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
import { CartItem } from '../../interfaces/venta.interface';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { LoadingService } from '../../../../../shared/services/loading.service';

export interface FacturaConfirmada {
  idCliente: number;
}

@Component({
  selector: 'app-factura-dialog',
  imports: [ModalComponent, UiButtonComponent, DecimalPipe, ClienteFormComponent],
  templateUrl: './factura-dialog.component.html',
  styleUrl: './factura-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaDialogComponent {
  private readonly clienteService = inject(ClienteService);
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
  protected readonly error = signal<string | null>(null);

  protected readonly clientesFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const items = this.clientes();
    if (!q) {
      return items;
    }
    return items.filter((c) => {
      const nombre = nombreCompletoPersona(c.persona).toLowerCase();
      const doc = c.persona?.documento?.toLowerCase() ?? '';
      const ruc = c.ruc?.toLowerCase() ?? '';
      return nombre.includes(q) || doc.includes(q) || ruc.includes(q);
    });
  });

  protected readonly cantidadItems = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad, 0),
  );

  protected readonly botonLabel = computed(() =>
    this.clienteSeleccionado() ? 'Cobrar e imprimir factura' : 'Seleccioná un cliente',
  );

  constructor() {
    this.cargarClientes();
  }

  protected nombreCliente(cliente: ClienteOutput): string {
    return nombreCompletoPersona(cliente.persona) || 'Sin nombre';
  }

  protected seleccionarCliente(cliente: ClienteOutput): void {
    this.clienteSeleccionado.set(cliente);
    this.error.set(null);
  }

  protected onBusquedaChange(value: string): void {
    this.busqueda.set(value);
  }

  protected abrirFormularioCliente(): void {
    this.mostrarFormularioCliente.set(true);
  }

  protected cerrarFormularioCliente(): void {
    this.mostrarFormularioCliente.set(false);
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
    if (!cliente?.id_cliente) {
      this.error.set('Seleccioná un cliente para continuar');
      return;
    }
    this.confirmar.emit({ idCliente: Number(cliente.id_cliente) });
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
}
