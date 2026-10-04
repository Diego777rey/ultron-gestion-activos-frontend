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
import {
  esRucConsultable,
  normalizarRuc,
} from '../../../../personas/shared/services/consulta-ruc.service';
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
  protected readonly documentoNuevoCliente = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly clientesFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const items = this.clientes();
    if (!q) {
      return items;
    }
    const qDocumento = normalizarRuc(q).replace(/-\d$/, '');
    return items.filter((c) => {
      const nombre = nombreCompletoPersona(c.persona).toLowerCase();
      const doc = normalizarRuc(c.persona?.documento).toLowerCase();
      const ruc = normalizarRuc(c.ruc).toLowerCase();
      return (
        nombre.includes(q) ||
        doc.includes(q) ||
        ruc.includes(q) ||
        (!!qDocumento && (doc.includes(qDocumento) || ruc.includes(qDocumento)))
      );
    });
  });

  /** Lo tipeado parece un CI/RUC que todavía no es cliente: se ofrece registrarlo. */
  protected readonly documentoSinCliente = computed(() => {
    const q = this.busqueda().trim();
    if (this.loadingClientes() || this.clientesFiltrados().length > 0 || !esRucConsultable(q)) {
      return null;
    }
    return normalizarRuc(q);
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

  protected abrirFormularioCliente(documento: string | null = null): void {
    const q = this.busqueda().trim();
    this.documentoNuevoCliente.set(documento ?? (esRucConsultable(q) ? normalizarRuc(q) : null));
    this.mostrarFormularioCliente.set(true);
  }

  protected cerrarFormularioCliente(): void {
    this.mostrarFormularioCliente.set(false);
  }

  /** Nuevo o existente: queda seleccionado para facturar. */
  protected usarCliente(cliente: ClienteOutput): void {
    this.mostrarFormularioCliente.set(false);
    this.busqueda.set('');
    this.seleccionarCliente(cliente);
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
          const seleccionado = this.clienteSeleccionado();
          if (seleccionado) {
            const actualizado = items.find((c) => c.id_cliente === seleccionado.id_cliente);
            if (actualizado) {
              this.clienteSeleccionado.set(actualizado);
            }
          }
        },
        error: () => {
          this.loadingClientes.set(false);
          this.error.set('No se pudieron cargar los clientes');
        },
      });
  }
}
