import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { EmpresaOutput } from '../../../../personas/empresas/interfaces/empresa.interface';
import { EmpresaService } from '../../../../personas/empresas/services/empresa.service';
import { TimbradoOutput } from '../../interfaces/timbrado.interface';
import { TimbradoService } from '../../services/timbrado.service';
import { TimbradoFormComponent } from '../../dialogs/timbrado-form/timbrado-form.component';

@Component({
  selector: 'app-timbrados-page',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './timbrados-page.component.html',
  styleUrl: './timbrados-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class TimbradosPageComponent {
  private readonly empresaService = inject(EmpresaService);
  private readonly timbradoService = inject(TimbradoService);
  private readonly dialogService = inject(AppDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly todas = signal<TimbradoOutput[]>([]);
  private loadSeq = 0;

  protected readonly empresa = signal<EmpresaOutput | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly empresaLabel = computed(() => {
    const empresa = this.empresa();
    if (!empresa) {
      return '';
    }
    const nombre = empresa.razon_social || empresa.nombre_fantasia || 'Empresa';
    return empresa.ruc ? `${nombre} — RUC ${empresa.ruc}` : nombre;
  });

  protected readonly filtradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.todas();
    if (!q) {
      return list;
    }
    return list.filter((timbrado) =>
      [
        timbrado.numero_timbrado,
        `${timbrado.establecimiento}-${timbrado.punto_expedicion}`,
        this.vigencia(timbrado),
        this.proximoNumero(timbrado),
        this.estadoTimbrado(timbrado),
      ].some((value) => (value ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly timbrados = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtradas().slice(start, start + this.pageSize());
  });

  protected readonly totalElements = computed(() => this.filtradas().length);

  protected readonly columns: TableColumn<TimbradoOutput>[] = [
    { key: 'numero_timbrado', header: 'Timbrado', width: '140px' },
    { key: 'punto', header: 'Punto', width: '120px' },
    { key: 'vigencia', header: 'Vigencia', width: '220px' },
    { key: 'proxima', header: 'Próxima factura', width: '180px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
  ];

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.load(params.get('idEmpresa'));
    });
  }

  protected load(idEmpresaParam = this.route.snapshot.queryParamMap.get('idEmpresa')): void {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        if (seq !== this.loadSeq) {
          return;
        }
        const empresa = resolverEmpresa(empresas, idEmpresaParam);
        this.empresa.set(empresa);
        if (!empresa?.id_empresa) {
          this.todas.set([]);
          this.loading.set(false);
          this.error.set('No hay una empresa registrada. Cargala en Datos de facturación.');
          return;
        }
        this.cargarTimbrados(empresa.id_empresa, seq);
      },
      error: (err: Error) => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.empresa.set(null);
        this.todas.set([]);
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pageIndex.set(0);
        break;
      case 'clear':
        this.search.set('');
        this.pageIndex.set(0);
        break;
      case 'add':
        this.abrirTimbrado();
        break;
    }
  }

  protected abrirTimbrado(timbrado?: TimbradoOutput): void {
    const empresa = this.empresa();
    if (!empresa?.id_empresa) {
      this.error.set('No hay una empresa registrada. Cargala en Datos de facturación.');
      return;
    }
    this.dialogService
      .openForm(TimbradoFormComponent, {
        title: timbrado ? 'Editar timbrado' : 'Nuevo timbrado',
        subtitle: empresa.razon_social || 'Autorización de la SET para facturas en papel',
        maxWidth: '720px',
        inputs: { timbrado: timbrado ?? null, idEmpresa: empresa.id_empresa },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected accionesTimbrado(timbrado: TimbradoOutput): MenuAction[] {
    return [
      { id: 'edit', label: 'Editar', icon: 'edit' },
      timbrado.activo
        ? { id: 'deactivate', label: 'Desactivar', icon: 'block', danger: true }
        : { id: 'activate', label: 'Activar', icon: 'check_circle' },
    ];
  }

  protected onTimbradoAction(actionId: string, timbrado: TimbradoOutput): void {
    if (actionId === 'edit') {
      this.abrirTimbrado(timbrado);
      return;
    }
    this.timbradoService.cambiarActivo(timbrado.id_timbrado, actionId === 'activate').subscribe({
      next: () => this.load(),
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo actualizar el timbrado');
      },
    });
  }

  protected estadoTimbrado(timbrado: TimbradoOutput): string {
    if (!timbrado.activo) {
      return 'Inactivo';
    }
    if (timbrado.esta_vigente === false) {
      return 'Vencido';
    }
    if ((timbrado.numeros_disponibles ?? 0) <= 0) {
      return 'Sin números';
    }
    return 'Vigente';
  }

  protected vigencia(timbrado: TimbradoOutput): string {
    return `${formatFecha(timbrado.fecha_inicio_vigencia)} al ${formatFecha(timbrado.fecha_fin_vigencia)}`;
  }

  protected proximoNumero(timbrado: TimbradoOutput): string {
    const numero = String(timbrado.numero_actual ?? 0).padStart(7, '0');
    return `${timbrado.establecimiento}-${timbrado.punto_expedicion}-${numero}`;
  }

  protected trackTimbrado = (timbrado: TimbradoOutput): unknown => timbrado.id_timbrado;

  private cargarTimbrados(idEmpresa: number, seq: number): void {
    this.timbradoService.listarPorEmpresa(idEmpresa).subscribe({
      next: (items) => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.todas.set(items.filter((item) => (item.tipo_factura ?? 'PAPEL') === 'PAPEL'));
        this.loading.set(false);
      },
      error: (err: Error) => {
        if (seq !== this.loadSeq) {
          return;
        }
        this.todas.set([]);
        this.error.set(err.message || 'No se pudieron cargar los timbrados');
        this.loading.set(false);
      },
    });
  }
}

function resolverEmpresa(empresas: EmpresaOutput[], idParam: string | null): EmpresaOutput | null {
  if (!empresas.length) {
    return null;
  }
  if (idParam) {
    const pedida = empresas.find((empresa) => String(empresa.id_empresa) === idParam);
    if (pedida) {
      return pedida;
    }
  }
  const activas = empresas.filter((empresa) => empresa.activa !== false);
  return (activas.length ? activas : empresas)[0];
}

function formatFecha(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return value;
}
