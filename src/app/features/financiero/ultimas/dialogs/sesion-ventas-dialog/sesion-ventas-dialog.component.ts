import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { PaginatorComponent } from '../../../../../shared/components/paginator/paginator';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import {
  ConteoDenominacionOutput,
  SesionCajaOutput,
} from '../../../../ventas/punto-de-venta/interfaces/sesion-caja.interface';
import { SesionCajaService } from '../../../../ventas/punto-de-venta/services/sesion-caja.service';
import { VentaOutput } from '../../interfaces/venta.interface';
import { VentaService } from '../../services/venta.service';

interface ConteoLinea {
  valor: number;
  cantidad: number;
  subtotal: number;
}

interface ConteoGrupo {
  moneda: string;
  label: string;
  simbolo: string;
  items: ConteoLinea[];
  total: number;
}

const MONEDA_META: Record<string, { label: string; simbolo: string }> = {
  PYG: { label: 'Guaraníes', simbolo: 'Gs.' },
  USD: { label: 'Dólares', simbolo: 'US$' },
  BRL: { label: 'Reales', simbolo: 'R$' },
};

@Component({
  selector: 'app-sesion-ventas-dialog',
  imports: [
    DatePipe,
    DecimalPipe,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
    UiButtonComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './sesion-ventas-dialog.component.html',
  styleUrl: './sesion-ventas-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SesionVentasDialogComponent {
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly ventaService = inject(VentaService);

  readonly sesion = input<SesionCajaOutput | null>(null);

  protected readonly detalle = signal<SesionCajaOutput | null>(null);
  protected readonly loadingSesion = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly ventas = signal<VentaOutput[]>([]);
  protected readonly loadingVentas = signal(false);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalVentas = signal(0);

  protected readonly columns: TableColumn<VentaOutput>[] = [
    { key: 'id_venta', header: 'Id', width: '90px' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'fecha', header: 'Fecha', width: '160px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'total', header: 'Total', width: '130px', align: 'right' },
  ];

  protected readonly sesionVista = computed(() => this.detalle() ?? this.sesion());

  protected readonly conteosApertura = computed(() =>
    this.agruparConteos(this.sesionVista()?.conteos ?? [], 'APERTURA'),
  );

  protected readonly conteosCierre = computed(() =>
    this.agruparConteos(this.sesionVista()?.conteos ?? [], 'CIERRE'),
  );

  constructor() {
    effect(() => {
      const actual = this.sesion();
      const id = actual?.id_sesion_caja;
      if (id == null) {
        return;
      }
      this.cargarDetalle(id);
      this.pageIndex.set(0);
      this.search.set('');
      this.cargarVentas(id);
    });
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    const id = this.sesionVista()?.id_sesion_caja;
    if (id != null) {
      this.cargarVentas(id);
    }
  }

  protected buscarVentas(): void {
    this.pageIndex.set(0);
    const id = this.sesionVista()?.id_sesion_caja;
    if (id != null) {
      this.cargarVentas(id);
    }
  }

  protected limpiarFiltro(): void {
    this.search.set('');
    this.buscarVentas();
  }

  protected personaLabel(sesion: SesionCajaOutput | null): string {
    if (!sesion?.persona) {
      return '—';
    }
    return `${sesion.persona.nombre ?? ''} ${sesion.persona.apellido ?? ''}`.trim() || '—';
  }

  protected estadoLabel(estado?: string | null): string {
    switch ((estado ?? '').toUpperCase()) {
      case 'ABIERTA':
        return 'Abierta';
      case 'CERRADA':
        return 'Cerrada';
      case 'PAGADA':
        return 'Pagada';
      default:
        return estado || '—';
    }
  }

  protected nvl(value?: number | null): number {
    return value ?? 0;
  }

  protected trackVenta = (v: VentaOutput): unknown => v.id_venta;

  private cargarDetalle(id: number): void {
    this.loadingSesion.set(true);
    this.error.set(null);
    this.sesionCajaService.findById(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.loadingSesion.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo cargar el detalle de la sesión');
        this.loadingSesion.set(false);
      },
    });
  }

  private cargarVentas(idSesionCaja: number): void {
    this.loadingVentas.set(true);
    this.ventaService
      .findPaginated(this.pageIndex(), this.pageSize(), this.search(), idSesionCaja)
      .subscribe({
        next: (response) => {
          this.ventas.set(response.content ?? []);
          this.totalVentas.set(response.pageInfo.totalElements);
          this.loadingVentas.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'No se pudieron cargar las ventas');
          this.loadingVentas.set(false);
        },
      });
  }

  private agruparConteos(
    conteos: ConteoDenominacionOutput[],
    tipo: string,
  ): ConteoGrupo[] {
    const grupos = new Map<string, ConteoGrupo>();
    for (const item of conteos) {
      if ((item.tipo ?? '').toUpperCase() !== tipo) {
        continue;
      }
      const moneda = (item.moneda ?? 'PYG').toUpperCase();
      const meta = MONEDA_META[moneda] ?? { label: moneda, simbolo: moneda };
      let grupo = grupos.get(moneda);
      if (!grupo) {
        grupo = { moneda, label: meta.label, simbolo: meta.simbolo, items: [], total: 0 };
        grupos.set(moneda, grupo);
      }
      const valor = Number(item.valorDenominacion ?? 0);
      const cantidad = Number(item.cantidad ?? 0);
      const subtotal = valor * cantidad;
      grupo.items.push({ valor, cantidad, subtotal });
      grupo.total += subtotal;
    }
    return ['PYG', 'USD', 'BRL']
      .map((codigo) => grupos.get(codigo))
      .filter((grupo): grupo is ConteoGrupo => !!grupo && grupo.items.length > 0);
  }
}
