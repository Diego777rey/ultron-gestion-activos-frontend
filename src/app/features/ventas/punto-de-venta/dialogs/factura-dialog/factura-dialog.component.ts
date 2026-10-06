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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
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
import { PageResponse } from '../../../../../shared/models/pagination.model';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';

export interface FacturaConfirmada {
  idCliente: number;
}

interface PedidoClientes {
  filtro: string;
  pagina: number;
}

const CLIENTES_POR_PAGINA = 20;
/** Distancia al final de la lista (px) a partir de la cual se pide la página siguiente. */
const UMBRAL_SCROLL = 48;

@Component({
  selector: 'app-factura-dialog',
  imports: [NotifyErrorComponent, ModalComponent, UiButtonComponent, DecimalPipe, ClienteFormComponent],
  templateUrl: './factura-dialog.component.html',
  styleUrl: './factura-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaDialogComponent {
  private readonly clienteService = inject(ClienteService);

  readonly cart = input.required<CartItem[]>();
  readonly total = input.required<number>();

  readonly cancelar = output<void>();
  readonly confirmar = output<FacturaConfirmada>();

  protected readonly clienteSeleccionado = signal<ClienteOutput | null>(null);
  protected readonly busqueda = signal('');
  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly loadingClientes = signal(false);
  protected readonly hayMasClientes = signal(false);
  protected readonly totalClientes = signal(0);
  protected readonly mostrarFormularioCliente = signal(false);
  protected readonly documentoNuevoCliente = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  /** Cliente recién registrado o encontrado: se muestra primero en la lista. */
  private readonly clienteDestacado = signal<ClienteOutput | null>(null);
  private paginaActual = 0;
  private readonly busqueda$ = new Subject<string>();
  private readonly pedidos$ = new Subject<PedidoClientes>();

  /** Lo tipeado parece un CI/RUC que todavía no es cliente: se ofrece registrarlo. */
  protected readonly documentoSinCliente = computed(() => {
    const q = this.busqueda().trim();
    if (this.loadingClientes() || this.clientes().length > 0 || !esRucConsultable(q)) {
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
    const nuevaBusqueda$ = this.busqueda$.pipe(
      debounceTime(300),
      map((q) => q.trim()),
      distinctUntilChanged(),
      map((filtro): PedidoClientes => ({ filtro, pagina: 0 })),
    );

    merge(nuevaBusqueda$, this.pedidos$)
      .pipe(
        takeUntilDestroyed(),
        switchMap((pedido) => {
          this.loadingClientes.set(true);
          return this.clienteService
            .findPaginated(pedido.pagina, CLIENTES_POR_PAGINA, pedido.filtro || undefined)
            .pipe(
              map((respuesta) => ({ pedido, respuesta })),
              catchError(() => of({ pedido, respuesta: null })),
            );
        }),
      )
      .subscribe(({ pedido, respuesta }) => this.recibirPagina(pedido, respuesta));

    this.pedidos$.next({ filtro: '', pagina: 0 });
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
    this.busqueda$.next(value);
  }

  protected cargarMasClientes(): void {
    if (this.loadingClientes() || !this.hayMasClientes()) {
      return;
    }
    this.pedidos$.next({ filtro: this.busqueda().trim(), pagina: this.paginaActual + 1 });
  }

  protected onScrollLista(event: Event): void {
    const lista = event.target as HTMLElement;
    if (lista.scrollTop + lista.clientHeight >= lista.scrollHeight - UMBRAL_SCROLL) {
      this.cargarMasClientes();
    }
  }

  protected abrirFormularioCliente(documento: string | null = null): void {
    const q = this.busqueda().trim();
    this.documentoNuevoCliente.set(documento ?? (esRucConsultable(q) ? normalizarRuc(q) : null));
    this.mostrarFormularioCliente.set(true);
  }

  protected cerrarFormularioCliente(): void {
    this.mostrarFormularioCliente.set(false);
  }

  /** Nuevo o existente: queda seleccionado y primero en la lista. */
  protected usarCliente(cliente: ClienteOutput): void {
    this.mostrarFormularioCliente.set(false);
    this.clienteDestacado.set(cliente);
    this.seleccionarCliente(cliente);
    this.busqueda.set('');
    this.busqueda$.next('');
    this.pedidos$.next({ filtro: '', pagina: 0 });
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

  private recibirPagina(pedido: PedidoClientes, respuesta: PageResponse<ClienteOutput> | null): void {
    this.loadingClientes.set(false);
    if (!respuesta) {
      this.error.set('No se pudieron cargar los clientes');
      return;
    }
    this.paginaActual = pedido.pagina;
    this.hayMasClientes.set(!respuesta.pageInfo.last);
    this.totalClientes.set(respuesta.pageInfo.totalElements);

    const activos = respuesta.content.filter((c) => c.estado !== false);
    if (pedido.pagina > 0) {
      const ids = new Set(this.clientes().map((c) => c.id_cliente));
      this.clientes.update((actuales) => [...actuales, ...activos.filter((c) => !ids.has(c.id_cliente))]);
      return;
    }

    const destacado = this.clienteDestacado();
    if (destacado && !pedido.filtro) {
      const actualizado = activos.find((c) => c.id_cliente === destacado.id_cliente) ?? destacado;
      this.clientes.set([actualizado, ...activos.filter((c) => c.id_cliente !== destacado.id_cliente)]);
      if (this.clienteSeleccionado()?.id_cliente === destacado.id_cliente) {
        this.clienteSeleccionado.set(actualizado);
      }
      return;
    }
    this.clientes.set(activos);
  }
}
