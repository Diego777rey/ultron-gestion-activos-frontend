import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-sesion-ventas-page',
  imports: [
    DatePipe,
    DecimalPipe,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
    UiButtonComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './sesion-ventas-page.component.html',
  styleUrl: './sesion-ventas-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class SesionVentasPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly ventaService = inject(VentaService);

  protected readonly detalle = signal<SesionCajaOutput | null>(null);
  protected readonly loadingSesion = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly ventas = signal<VentaOutput[]>([]);
  protected readonly loadingVentas = signal(false);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalVentas = signal(0);

  protected readonly columns: TableColumn<VentaOutput>[] = [
    { key: 'id_venta', header: 'Nº de venta', width: '120px', align: 'center' },
    { key: 'cliente', header: 'Cliente', width: '200px' },
    { key: 'fecha', header: 'Fecha', width: '160px', align: 'center' },
    { key: 'formaPago', header: 'Forma de pago', width: '130px', align: 'center' },
    { key: 'estado', header: 'Estado', width: '100px', align: 'center' },
    { key: 'total', header: 'Total', width: '120px', align: 'right' },
  ];

  protected readonly sesionVista = computed(() => this.detalle());

  protected readonly subtitle = computed(() => {
    const s = this.sesionVista();
    if (!s) {
      return '';
    }
    const cajaNombre = s.caja?.nombre || 'caja';
    return `${cajaNombre} · Sesión #${s.id_sesion_caja}`;
  });

  protected readonly conteosApertura = computed(() =>
    this.agruparConteos(this.sesionVista()?.conteos ?? [], 'APERTURA'),
  );

  protected readonly conteosCierre = computed(() =>
    this.agruparConteos(this.sesionVista()?.conteos ?? [], 'CIERRE'),
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('idSesion'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loadingSesion.set(false);
      this.error.set('La sesión de caja no es válida');
      return;
    }
    this.cargarDetalle(id);
    this.cargarVentas(id);
  }

  protected volver(): void {
    this.router.navigate(['/financiero/ultimas']);
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

  protected formaPagoLabel(formaPago?: string | null): string {
    switch ((formaPago ?? '').toUpperCase()) {
      case 'EFECTIVO':
        return 'Efectivo';
      case 'TARJETA':
        return 'Tarjeta';
      case 'TRANSFERENCIA':
        return 'Transferencia';
      default:
        return formaPago || 'Efectivo';
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
