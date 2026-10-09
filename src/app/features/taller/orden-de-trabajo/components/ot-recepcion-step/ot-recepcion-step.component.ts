import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, map, startWith } from 'rxjs';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { PaginatorComponent } from '../../../../../shared/components/paginator/paginator';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { VehiculoService } from '../../../../activos/vehiculos/services/vehiculo.service';
import { VehiculoOutput } from '../../../../activos/vehiculos/interfaces/vehiculo.interface';
import { VehiculoFormComponent } from '../../../../activos/vehiculos/dialogs/vehiculo-form/vehiculo-form';
import { EquipoService } from '../../../../activos/equipos/services/equipo.service';
import { EquipoOutput, equipoLabel } from '../../../../activos/equipos/interfaces/equipo.interface';
import { EquipoFormComponent } from '../../../../activos/equipos/dialogs/equipo-form/equipo-form';
import { FuncionarioService } from '../../../../personas/funcionarios/services/funcionario.service';
import { FuncionarioOutput } from '../../../../personas/funcionarios/interfaces/funcionario.interface';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { SectorFormComponent } from '../../../../sectores/dialogs/sector-form/sector-form.component';
import { UltimoSectorStore } from '../../../../sectores/services/ultimo-sector.store';
import { UsuarioService } from '../../../../personas/usuarios/services/usuario.service';
import { UsuarioOutput } from '../../../../personas/usuarios/interfaces/usuario.interface';
import { AuthService } from '../../../../../core/auth/auth.service';
import {
  ETAPAS_ORDEN,
  OrdenTrabajoInput,
  OrdenTrabajoOutput,
  TipoRecepcion,
  equiposDeOrden,
  tipoRecepcionDe,
} from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OtSectionStatus } from '../ot-collapsible-section/ot-collapsible-section.component';

export interface EstadoInicialOpcion {
  control: string;
  label: string;
  icon: string;
  group: 'falla' | 'condicion';
}

@Component({
  selector: 'app-ot-recepcion-step',
  imports: [
    ReactiveFormsModule,
    EntitySearcherComponent,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
  ],
  templateUrl: './ot-recepcion-step.component.html',
  styleUrls: ['../../styles/ot-form.scss', '../../styles/ot-diagnostico.scss', './ot-recepcion-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtRecepcionStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(AppDialogService);
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly equipoService = inject(EquipoService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly sectorService = inject(SectorService);
  private readonly ultimoSector = inject(UltimoSectorStore);
  private readonly usuarioService = inject(UsuarioService);
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly orden = input<OrdenTrabajoOutput | null>(null);
  readonly soloLectura = input(false);
  readonly formReady = output<FormGroup>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly estadoGuardado = signal<'idle' | 'guardando' | 'guardado'>('idle');

  /** Fuerza recomputo de badges cuando se marca touched al avanzar. */
  private readonly formTick = signal(0);
  private hidratado = false;
  private ordenId: string | null = null;
  private ultimoGuardado = '';
  private saveChain: Promise<void> = Promise.resolve();

  protected readonly historial = signal<OrdenTrabajoOutput[]>([]);
  protected readonly historialLoading = signal(false);
  protected readonly historialPageIndex = signal(0);
  protected readonly historialPageSize = signal(10);
  protected readonly historialTotal = signal(0);
  private historialSeq = 0;

  protected readonly selectedCliente = signal<ClienteOutput | null>(null);
  protected readonly selectedVehiculo = signal<VehiculoOutput | null>(null);
  protected readonly selectedEquipos = signal<EquipoOutput[]>([]);
  protected readonly equipoBusquedaId = signal('');
  protected readonly selectedSector = signal<SectorOutput | null>(null);
  protected readonly selectedUsuario = signal<UsuarioOutput | null>(null);
  protected readonly selectedMecanicos = signal<FuncionarioOutput[]>([]);
  protected readonly mecanicoBusquedaId = signal('');

  protected readonly nivelesCombustible = [
    { value: '', label: 'Sin indicar' },
    { value: 'VACIO', label: 'Vacío' },
    { value: 'CUARTO', label: '1/4' },
    { value: 'MEDIO', label: '1/2' },
    { value: 'TRES_CUARTOS', label: '3/4' },
    { value: 'LLENO', label: 'Lleno' },
  ];

  protected readonly opcionesEstado: EstadoInicialOpcion[] = [
    { control: 'falla_mecanica', label: 'Reporta falla mecánica', icon: 'build', group: 'falla' },
    { control: 'falla_electrica', label: 'Reporta falla eléctrica', icon: 'bolt', group: 'falla' },
    { control: 'estado_llantas', label: 'Tiene ruedas dañadas o ponchadas', icon: 'trip_origin', group: 'condicion' },
    { control: 'estado_pintura', label: 'Tiene pintura dañada', icon: 'format_paint', group: 'condicion' },
    { control: 'estado_rayones', label: 'Posee rayones', icon: 'brush', group: 'condicion' },
    { control: 'estado_golpes', label: 'Tiene golpes o abolladuras', icon: 'warning', group: 'condicion' },
    { control: 'estado_vidrios', label: 'Tiene vidrios dañados', icon: 'crop_square', group: 'condicion' },
    { control: 'perdida_aceite', label: 'Presenta pérdida de aceite', icon: 'oil_barrel', group: 'condicion' },
    { control: 'luces_danadas', label: 'Tiene luces dañadas', icon: 'lightbulb', group: 'condicion' },
    { control: 'espejos_danados', label: 'Tiene espejos dañados', icon: 'flip', group: 'condicion' },
    { control: 'accesorios_faltantes', label: 'Tiene piezas o accesorios faltantes', icon: 'extension_off', group: 'condicion' },
  ];

  protected readonly form = this.fb.group({
    id_sector: ['', Validators.required],
    id_responsable: ['', Validators.required],
    id_cliente: ['', Validators.required],
    tipo_recepcion: this.fb.nonNullable.control<TipoRecepcion>('VEHICULO'),
    id_vehiculo: ['', Validators.required],
    ids_equipos: this.fb.nonNullable.control<string[]>([]),
    id_mecanico: [''],
    ids_mecanicos: this.fb.nonNullable.control<string[]>([], Validators.minLength(1)),
    descripcion_falla: ['', Validators.required],
    falla_mecanica: [false],
    falla_electrica: [false],
    estado_llantas: [false],
    estado_pintura: [false],
    estado_rayones: [false],
    estado_golpes: [false],
    estado_vidrios: [false],
    perdida_aceite: [false],
    luces_danadas: [false],
    espejos_danados: [false],
    accesorios_faltantes: [false],
    nivel_combustible: [''],
    kilometraje: [null as number | null],
    observaciones_estado: [''],
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  private readonly historialVehiculoId = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map((v) => ((v.id_vehiculo as string) || null)),
      distinctUntilChanged()
    ),
    { initialValue: null as string | null }
  );

  protected readonly tipoRecepcion = computed<TipoRecepcion>(() => {
    this.formValue();
    return this.form.controls.tipo_recepcion.value;
  });

  protected readonly vehiculoSeleccionado = computed(() => {
    this.formValue();
    return !!this.form.controls.id_vehiculo.value;
  });

  protected readonly historialColumns: TableColumn<OrdenTrabajoOutput>[] = [
    { key: 'numero_orden', header: 'Nº Orden', width: '110px' },
    { key: 'etapa', header: 'Etapa', width: '128px' },
    {
      key: 'fecha_recepcion',
      header: 'Recepción',
      width: '112px',
      value: (orden) => this.formatFecha(orden.fecha_creacion),
    },
    {
      key: 'fecha_finalizacion',
      header: 'Finalización',
      width: '118px',
      value: (orden) => this.formatFecha(orden.fecha_finalizacion),
    },
    {
      key: 'falla',
      header: 'Falla',
      value: (orden) => orden.recepcion?.descripcion_falla?.trim() || '—',
    },
    {
      key: 'diagnostico',
      header: 'Presupuesto',
      width: '120px',
      align: 'right',
      value: (orden) => this.formatMonto(orden.diagnostico?.total_presupuesto),
    },
    { key: 'ver', header: '', width: '52px', align: 'center' },
  ];

  protected readonly trackHistorial = (orden: OrdenTrabajoOutput): unknown => orden.id_orden_trabajo;

  protected readonly statusClienteVehiculo = computed(() =>
    this.sectionStatus(['id_cliente', 'id_vehiculo', 'ids_equipos'])
  );
  protected readonly statusDatos = computed(() =>
    this.sectionStatus(['id_sector', 'id_responsable', 'ids_mecanicos'])
  );
  protected readonly statusFalla = computed(() => this.sectionStatus(['descripcion_falla']));
  protected readonly statusEstado = computed((): OtSectionStatus => {
    this.formTick();
    const v = this.formValue();
    const marcado = this.opcionesEstado.some((o) => !!(v as Record<string, unknown>)[o.control]);
    const km = v.kilometraje;
    const tieneKm = km !== null && km !== undefined && String(km).trim() !== '';
    const tieneNivel = !!v.nivel_combustible;
    const tieneObs = !!String(v.observaciones_estado ?? '').trim();
    return marcado || tieneKm || tieneNivel || tieneObs ? 'ok' : 'none';
  });

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly clientesTotal = signal(0);
  protected readonly loadingClientes = signal(false);
  protected readonly clienteColumns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'CI/RUC', value: (c) => c.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre completo', value: (c) => this.clienteLabel(c) },
  ];
  protected readonly clienteLabelFn = (c: ClienteOutput) => this.clienteLabel(c);
  protected readonly clienteKeyFn = (c: ClienteOutput) => c.id_cliente;

  protected readonly vehiculos = signal<VehiculoOutput[]>([]);
  protected readonly vehiculosTotal = signal(0);
  protected readonly loadingVehiculos = signal(false);
  protected readonly vehiculoColumns: TableColumn<VehiculoOutput>[] = [
    { key: 'chapa', header: 'Chapa', value: (v) => v.chapa ?? '' },
    { key: 'vehiculo', header: 'Vehículo', value: (v) => this.vehiculoLabel(v) },
  ];
  protected readonly vehiculoLabelFn = (v: VehiculoOutput) => this.vehiculoLabel(v);
  protected readonly vehiculoKeyFn = (v: VehiculoOutput) => v.id_bien;

  protected readonly equipos = signal<EquipoOutput[]>([]);
  protected readonly equiposTotal = signal(0);
  protected readonly loadingEquipos = signal(false);
  protected readonly equipoColumns: TableColumn<EquipoOutput>[] = [
    { key: 'tipo', header: 'Tipo', value: (e) => e.tipo_equipo ?? '' },
    { key: 'equipo', header: 'Marca / Modelo', value: (e) => [e.marca, e.modelo].filter(Boolean).join(' ') },
    { key: 'serie', header: 'N° de serie', value: (e) => e.numero_serie ?? '' },
    { key: 'vehiculo', header: 'Vehículo', value: (e) => (e.vehiculo ? this.vehiculoLabel(e.vehiculo) : 'Sin vehículo') },
  ];
  protected readonly equipoLabelFn = (e: EquipoOutput) => equipoLabel(e);
  protected readonly equipoKeyFn = (e: EquipoOutput) => e.id_equipo;

  protected readonly mecanicos = signal<FuncionarioOutput[]>([]);
  protected readonly mecanicosTotal = signal(0);
  protected readonly loadingMecanicos = signal(false);
  protected readonly mecanicoColumns: TableColumn<FuncionarioOutput>[] = [
    { key: 'documento', header: 'CI', value: (f) => f.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre completo', value: (f) => this.mecanicoLabel(f) },
  ];
  protected readonly mecanicoLabelFn = (f: FuncionarioOutput) => this.mecanicoLabel(f);
  protected readonly mecanicoKeyFn = (f: FuncionarioOutput) => f.id_funcionario;

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly loadingSectores = signal(false);
  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'nombre', header: 'Sector', value: (s) => s.nombre ?? '' },
  ];
  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? '';
  protected readonly sectorKeyFn = (s: SectorOutput) => String(s.id_sector);

  protected readonly usuarios = signal<UsuarioOutput[]>([]);
  protected readonly usuariosTotal = signal(0);
  protected readonly loadingUsuarios = signal(false);
  protected readonly usuarioColumns: TableColumn<UsuarioOutput>[] = [
    { key: 'username', header: 'Usuario', value: (u) => u.username ?? '' },
    {
      key: 'nombre',
      header: 'Nombre completo',
      value: (u) => nombreCompletoPersona(u.funcionario?.persona),
    },
  ];
  protected readonly usuarioLabelFn = (u: UsuarioOutput) =>
    u.username ?? nombreCompletoPersona(u.funcionario?.persona);
  protected readonly usuarioKeyFn = (u: UsuarioOutput) => u.id;

  constructor() {
    effect(() => {
      const data = this.orden();
      const lectura = this.soloLectura();
      if (!data) return;
      if (!this.hidratado && !this.form.dirty) {
        this.patchFromOrden(data);
        this.ultimoGuardado = this.firmaFormulario();
        if (lectura) {
          this.form.disable({ emitEvent: false });
        }
      }
      this.ordenId = data.id_orden_trabajo ?? this.ordenId;
      this.hidratado = true;
    });

    effect(() => {
      const idVehiculo = this.historialVehiculoId();
      untracked(() => this.abrirHistorial(idVehiculo));
    });
  }

  ngOnInit(): void {
    this.formReady.emit(this.form);
    this.fetchClientes(0, 10, '');
    this.fetchVehiculos(0, 10, '');
    this.fetchEquipos(0, 10, '');
    this.fetchMecanicos(0, 10, '');
    this.fetchSectores(0, 10, '');
    this.fetchUsuarios(0, 10, '');
    this.precargarResponsableDeSesion();
    if (this.soloLectura()) return;
    this.form.valueChanges
      .pipe(debounceTime(450), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.encolar();
      });
    this.destroyRef.onDestroy(() => {
      void this.encolar();
    });
  }

  /** Guarda lo que haya cargado y devuelve la orden persistida. */
  encolar(): Promise<OrdenTrabajoOutput | null> {
    const run = this.saveChain.then(() => this.ejecutarGuardado());
    this.saveChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Expone el input tipado para avanzar de etapa. */
  buildInput(): OrdenTrabajoInput | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formTick.update((n) => n + 1);
      return null;
    }
    return this.armarInput();
  }

  private armarInput(): OrdenTrabajoInput {
    const v = this.form.getRawValue();
    const kmRaw = v.kilometraje;
    const kilometraje =
      kmRaw === null || kmRaw === undefined || String(kmRaw).trim() === ''
        ? null
        : Number(kmRaw);

    const esEquipo = v.tipo_recepcion === 'EQUIPO';

    return {
      id_sector: v.id_sector,
      id_responsable: v.id_responsable,
      id_cliente: v.id_cliente,
      tipo_recepcion: v.tipo_recepcion,
      id_vehiculo: v.id_vehiculo || null,
      ids_equipos: esEquipo ? v.ids_equipos : [],
      id_mecanico: v.ids_mecanicos[0] ?? v.id_mecanico ?? null,
      ids_mecanicos: v.ids_mecanicos,
      recepcion: {
        descripcion_falla: v.descripcion_falla,
      },
      estado_vehiculo: esEquipo ? null : {
        falla_mecanica: !!v.falla_mecanica,
        falla_electrica: !!v.falla_electrica,
        estado_llantas: !!v.estado_llantas,
        estado_pintura: !!v.estado_pintura,
        estado_rayones: !!v.estado_rayones,
        estado_golpes: !!v.estado_golpes,
        estado_vidrios: !!v.estado_vidrios,
        perdida_aceite: !!v.perdida_aceite,
        luces_danadas: !!v.luces_danadas,
        espejos_danados: !!v.espejos_danados,
        accesorios_faltantes: !!v.accesorios_faltantes,
        nivel_combustible: v.nivel_combustible || null,
        kilometraje: kilometraje !== null && !Number.isNaN(kilometraje) ? kilometraje : null,
        observaciones_estado: v.observaciones_estado || null,
      },
    };
  }

  private firmaFormulario(): string {
    if (this.form.invalid) return '';
    return JSON.stringify(this.armarInput());
  }

  private async ejecutarGuardado(): Promise<OrdenTrabajoOutput | null> {
    if (this.soloLectura() || this.form.invalid) return null;
    const input = this.armarInput();
    const firma = JSON.stringify(input);
    if (this.ordenId && firma === this.ultimoGuardado) {
      return this.orden();
    }
    this.estadoGuardado.set('guardando');
    try {
      const updated = await firstValueFrom(
        this.ordenId
          ? this.ordenService.actualizarSilencioso(this.ordenId, input)
          : this.ordenService.crearSilencioso(input),
      );
      this.ordenId = updated.id_orden_trabajo ?? this.ordenId;
      this.ultimoGuardado = firma;
      this.estadoGuardado.set('guardado');
      this.ordenChange.emit(updated);
      return updated;
    } catch (err) {
      this.estadoGuardado.set('idle');
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'No se pudo guardar la recepción';
      this.errorChange.emit(message);
      return null;
    }
  }

  protected statusIcon(status: OtSectionStatus): string {
    switch (status) {
      case 'ok':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'radio_button_unchecked';
    }
  }

  protected verOrden(orden: OrdenTrabajoOutput, event: Event): void {
    event.stopPropagation();
    const id = orden.id_orden_trabajo;
    if (!id) return;
    void this.router.navigate(['/taller/orden-de-trabajo/detalle', id]);
  }

  protected onHistorialPage(event: PageChange): void {
    this.historialPageIndex.set(event.pageIndex);
    this.historialPageSize.set(event.pageSize);
    const idVehiculo = this.form.controls.id_vehiculo.value;
    if (!idVehiculo) return;
    this.cargarHistorial(idVehiculo, event.pageIndex, event.pageSize);
  }

  protected getEtapaInfo(etapa?: string | null) {
    return (
      ETAPAS_ORDEN.find((item) => item.valor === etapa) ?? {
        label: etapa ?? '—',
        icono: 'help',
        color: '#9E9E9E',
      }
    );
  }

  protected opcionesPorGrupo(group: 'falla' | 'condicion'): EstadoInicialOpcion[] {
    return this.opcionesEstado.filter((o) => o.group === group);
  }

  protected isChecked(control: string): boolean {
    return !!this.form.get(control)?.value;
  }

  protected toggleEstado(control: string): void {
    const ctrl = this.form.get(control);
    if (!ctrl) return;
    ctrl.setValue(!ctrl.value);
    ctrl.markAsDirty();
  }

  protected patchFromOrden(data: OrdenTrabajoOutput | null): void {
    if (!data) return;
    const estado = data.estado_vehiculo;
    const tipo = tipoRecepcionDe(data);
    this.aplicarValidadoresTipo(tipo);
    this.form.patchValue({
      id_sector: data.sector?.id_sector ? String(data.sector.id_sector) : '',
      id_responsable: data.responsable?.id ? String(data.responsable.id) : '',
      id_cliente: data.cliente?.id_cliente ?? '',
      tipo_recepcion: tipo,
      id_vehiculo: data.vehiculo?.id_bien ?? '',
      descripcion_falla: data.recepcion?.descripcion_falla || '',
      falla_mecanica: !!estado?.falla_mecanica,
      falla_electrica: !!estado?.falla_electrica,
      estado_llantas: !!estado?.estado_llantas,
      estado_pintura: !!estado?.estado_pintura,
      estado_rayones: !!estado?.estado_rayones,
      estado_golpes: !!estado?.estado_golpes,
      estado_vidrios: !!estado?.estado_vidrios,
      perdida_aceite: !!estado?.perdida_aceite,
      luces_danadas: !!estado?.luces_danadas,
      espejos_danados: !!estado?.espejos_danados,
      accesorios_faltantes: !!estado?.accesorios_faltantes,
      nivel_combustible: estado?.nivel_combustible || '',
      kilometraje: estado?.kilometraje ?? null,
      observaciones_estado: estado?.observaciones_estado || '',
    });

    if (data.cliente) {
      this.selectedCliente.set(data.cliente);
      this.clientes.update((list) => this.ensureInList(list, data.cliente!, (c) => c.id_cliente));
    }
    if (data.vehiculo) {
      this.selectedVehiculo.set(data.vehiculo);
      this.vehiculos.update((list) => this.ensureInList(list, data.vehiculo!, (v) => v.id_bien));
    }
    const equipos = equiposDeOrden(data);
    this.selectedEquipos.set(equipos);
    this.syncIdsEquipos(false);
    for (const equipo of equipos) {
      this.equipos.update((list) => this.ensureInList(list, equipo, (e) => e.id_equipo));
    }
    if (data.sector) {
      const sector = {
        id_sector: data.sector.id_sector != null ? Number(data.sector.id_sector) : 0,
        nombre: data.sector.nombre ?? '',
      } as SectorOutput;
      this.selectedSector.set(sector);
      this.sectores.update((list) => this.ensureInList(list, sector, (s) => s.id_sector));
    }
    if (data.responsable) {
      const usuario = {
        id: data.responsable.id ?? '',
        username: data.responsable.username ?? undefined,
        funcionario: data.responsable.funcionario ?? undefined,
      } as UsuarioOutput;
      this.selectedUsuario.set(usuario);
      this.usuarios.update((list) => this.ensureInList(list, usuario, (u) => u.id));
    }
    const mecanicosAsignados = (data.mecanicos?.length ? data.mecanicos : data.mecanico ? [data.mecanico] : [])
      .map((m) => ({
        id_funcionario: m.id_funcionario ?? '',
        persona: m.persona ?? undefined,
      } as FuncionarioOutput))
      .filter((m) => !!m.id_funcionario);
    this.selectedMecanicos.set(mecanicosAsignados);
    this.syncIdsMecanicos(false);
    for (const mecanico of mecanicosAsignados) {
      this.mecanicos.update((list) => this.ensureInList(list, mecanico, (m) => m.id_funcionario));
    }
  }

  protected fetchClientes(page: number, size: number, filter: string): void {
    this.loadingClientes.set(true);
    this.clienteService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.clientes.set(res.content);
        this.clientesTotal.set(res.pageInfo.totalElements);
        this.loadingClientes.set(false);
      },
      error: () => this.loadingClientes.set(false),
    });
  }

  protected onClienteSelected(cliente: ClienteOutput | null): void {
    this.form.controls.id_cliente.setValue(cliente?.id_cliente ?? '');
    this.selectedCliente.set(cliente);
    this.form.controls.id_vehiculo.setValue('');
    this.selectedVehiculo.set(null);
    this.selectedEquipos.set([]);
    this.syncIdsEquipos(false);
    this.fetchVehiculos(0, 10, '');
    this.fetchEquipos(0, 10, '');
  }

  protected seleccionarTipoRecepcion(tipo: TipoRecepcion): void {
    if (this.soloLectura() || this.form.controls.tipo_recepcion.value === tipo) return;
    this.aplicarValidadoresTipo(tipo);
    if (tipo === 'VEHICULO') {
      this.selectedEquipos.set([]);
      this.syncIdsEquipos(false);
    }
    this.form.controls.tipo_recepcion.setValue(tipo);
    this.form.controls.tipo_recepcion.markAsDirty();
    this.formTick.update((n) => n + 1);
  }

  /** Vehículo: el vehículo es obligatorio. Equipo: al menos un equipo y el vehículo opcional. */
  private aplicarValidadoresTipo(tipo: TipoRecepcion): void {
    const { id_vehiculo, ids_equipos } = this.form.controls;
    id_vehiculo.setValidators(tipo === 'VEHICULO' ? Validators.required : null);
    ids_equipos.setValidators(tipo === 'EQUIPO' ? Validators.required : null);
    id_vehiculo.updateValueAndValidity({ emitEvent: false });
    ids_equipos.updateValueAndValidity({ emitEvent: false });
  }

  protected fetchEquipos(page: number, size: number, filter: string): void {
    this.loadingEquipos.set(true);
    const idCliente = this.form.controls.id_cliente.value;
    const request = idCliente
      ? this.equipoService.findByCliente(idCliente, 100, filter).pipe(
          map((content) => ({ content, total: content.length })),
        )
      : this.equipoService
          .findPaginated(page, size, filter)
          .pipe(map((res) => ({ content: res.content, total: res.pageInfo.totalElements })));
    request.subscribe({
      next: ({ content, total }) => {
        let list = content;
        for (const selected of this.selectedEquipos()) {
          list = this.ensureInList(list, selected, (e) => e.id_equipo);
        }
        this.equipos.set(list);
        this.equiposTotal.set(total);
        this.loadingEquipos.set(false);
      },
      error: () => this.loadingEquipos.set(false),
    });
  }

  /**
   * Agrega el equipo a la orden. Completa el cliente si faltaba y, si todavía no hay
   * vehículo, toma el vehículo donde está montado el equipo.
   */
  protected onEquipoSelected(equipo: EquipoOutput | null): void {
    this.equipoBusquedaId.set('');
    if (!equipo?.id_equipo) return;
    if (this.selectedEquipos().some((e) => e.id_equipo === equipo.id_equipo)) return;
    this.selectedEquipos.update((list) => [...list, equipo]);
    this.equipos.update((list) => this.ensureInList(list, equipo, (e) => e.id_equipo));
    this.syncIdsEquipos(true);
    if (equipo.cliente?.id_cliente && !this.form.controls.id_cliente.value) {
      this.form.controls.id_cliente.setValue(equipo.cliente.id_cliente);
      this.selectedCliente.set(equipo.cliente);
      this.clientes.update((list) => this.ensureInList(list, equipo.cliente!, (c) => c.id_cliente));
      this.fetchVehiculos(0, 10, '');
    }
    if (equipo.vehiculo?.id_bien && !this.form.controls.id_vehiculo.value) {
      this.form.controls.id_vehiculo.setValue(equipo.vehiculo.id_bien);
      this.selectedVehiculo.set(equipo.vehiculo);
      this.vehiculos.update((list) => this.ensureInList(list, equipo.vehiculo!, (v) => v.id_bien));
    }
  }

  protected quitarEquipo(equipo: EquipoOutput): void {
    this.selectedEquipos.update((list) => list.filter((e) => e.id_equipo !== equipo.id_equipo));
    this.syncIdsEquipos(true);
  }

  private syncIdsEquipos(markTouched: boolean): void {
    const ids = this.selectedEquipos()
      .map((e) => e.id_equipo)
      .filter((id): id is string => !!id);
    this.form.controls.ids_equipos.setValue(ids);
    if (markTouched) {
      this.form.controls.ids_equipos.markAsTouched();
      this.form.controls.ids_equipos.markAsDirty();
    }
  }

  protected onAddEquipo(): void {
    const cliente = this.selectedCliente();
    const vehiculo = this.selectedVehiculo();
    this.dialogService
      .openForm<EquipoOutput | boolean>(EquipoFormComponent, {
        title: 'Nuevo Equipo',
        subtitle: 'Registra un equipo del cliente; el vehículo es opcional',
        maxWidth: '760px',
        inputs: cliente ? { equipo: { cliente, vehiculo } as EquipoOutput } : {},
      })
      .subscribe((saved) => {
        if (!saved) return;
        if (typeof saved === 'object') {
          this.onEquipoSelected(saved);
        }
        this.fetchEquipos(0, 10, '');
      });
  }

  protected onAddCliente(): void {
    this.dialogService
      .openForm(ClienteFormComponent, {
        title: 'Nuevo Cliente',
        subtitle: 'Completa los datos para registrar un cliente',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) this.fetchClientes(0, 10, '');
      });
  }

  protected fetchVehiculos(page: number, size: number, filter: string): void {
    this.loadingVehiculos.set(true);
    const idCliente = this.form.controls.id_cliente.value;
    if (idCliente) {
      this.vehiculoService.findByCliente(idCliente, 100).subscribe({
        next: (vehiculos) => {
          const filtered = filter
            ? vehiculos.filter(
                (v) =>
                  (v.chapa?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                  (v.marca?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                  (v.modelo?.toLowerCase() || '').includes(filter.toLowerCase())
              )
            : vehiculos;
          this.vehiculos.set(filtered);
          this.vehiculosTotal.set(filtered.length);
          this.loadingVehiculos.set(false);
        },
        error: () => this.loadingVehiculos.set(false),
      });
    } else {
      this.vehiculoService.findPaginated(page, size, filter).subscribe({
        next: (res) => {
          this.vehiculos.set(res.content);
          this.vehiculosTotal.set(res.pageInfo.totalElements);
          this.loadingVehiculos.set(false);
        },
        error: () => this.loadingVehiculos.set(false),
      });
    }
  }

  protected onVehiculoSelected(vehiculo: VehiculoOutput | null): void {
    this.form.controls.id_vehiculo.setValue(vehiculo?.id_bien ?? '');
    this.selectedVehiculo.set(vehiculo);
  }

  protected onAddVehiculo(): void {
    const idCliente = this.form.controls.id_cliente.value;
    const cliente = this.selectedCliente()
      ?? this.clientes().find((c) => c.id_cliente === idCliente)
      ?? null;
    this.dialogService
      .openForm(VehiculoFormComponent, {
        title: 'Nuevo Vehículo',
        subtitle: 'Registra un vehículo asociado al cliente',
        maxWidth: '760px',
        inputs: cliente ? { vehiculo: { cliente } as VehiculoOutput } : {},
      })
      .subscribe((saved) => {
        if (saved) this.fetchVehiculos(0, 10, '');
      });
  }

  protected fetchMecanicos(page: number, size: number, filter: string): void {
    this.loadingMecanicos.set(true);
    this.funcionarioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        let list = res.content;
        for (const selected of this.selectedMecanicos()) {
          list = this.ensureInList(list, selected, (m) => m.id_funcionario);
        }
        this.mecanicos.set(list);
        this.mecanicosTotal.set(res.pageInfo.totalElements);
        this.loadingMecanicos.set(false);
      },
      error: () => this.loadingMecanicos.set(false),
    });
  }

  protected onMecanicoSelected(mecanico: FuncionarioOutput | null): void {
    if (!mecanico?.id_funcionario) return;
    if (this.selectedMecanicos().some((m) => m.id_funcionario === mecanico.id_funcionario)) {
      this.mecanicoBusquedaId.set('');
      return;
    }
    this.selectedMecanicos.update((list) => [...list, mecanico]);
    this.mecanicos.update((list) => this.ensureInList(list, mecanico, (m) => m.id_funcionario));
    this.syncIdsMecanicos(true);
    this.mecanicoBusquedaId.set('');
  }

  protected quitarMecanico(mecanico: FuncionarioOutput): void {
    this.selectedMecanicos.update((list) =>
      list.filter((m) => m.id_funcionario !== mecanico.id_funcionario)
    );
    this.syncIdsMecanicos(true);
  }

  private syncIdsMecanicos(markTouched: boolean): void {
    const ids = this.selectedMecanicos()
      .map((m) => m.id_funcionario)
      .filter((id): id is string => !!id);
    this.form.controls.ids_mecanicos.setValue(ids);
    this.form.controls.id_mecanico.setValue(ids[0] ?? '');
    if (markTouched) {
      this.form.controls.ids_mecanicos.markAsTouched();
      this.form.controls.ids_mecanicos.markAsDirty();
    }
  }

  protected fetchSectores(page: number, size: number, filter: string): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        const last = this.ultimoSector.lastCreated();
        const list = last
          ? this.ensureInList(res.content, last, (s) => s.id_sector)
          : res.content;
        this.sectores.set(list);
        this.sectoresTotal.set(res.pageInfo.totalElements);
        this.loadingSectores.set(false);
      },
      error: () => this.loadingSectores.set(false),
    });
  }

  protected onAddSector(): void {
    this.dialogService
      .openForm(SectorFormComponent, {
        title: 'Nuevo Sector',
        subtitle: 'Registrá una ubicación física (depósito, salón de ventas, etc.)',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.fetchSectores(0, 10, '');
        }
      });
  }

  protected onSectorSelected(sector: SectorOutput | null): void {
    this.form.controls.id_sector.setValue(
      sector?.id_sector != null ? String(sector.id_sector) : ''
    );
    this.selectedSector.set(sector);
  }

  protected fetchUsuarios(page: number, size: number, filter: string): void {
    this.loadingUsuarios.set(true);
    this.usuarioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        const selected = this.selectedUsuario();
        this.usuarios.set(
          selected ? this.ensureInList(res.content, selected, (u) => u.id) : res.content
        );
        this.usuariosTotal.set(res.pageInfo.totalElements);
        this.loadingUsuarios.set(false);
      },
      error: () => this.loadingUsuarios.set(false),
    });
  }

  protected onUsuarioSelected(usuario: UsuarioOutput | null): void {
    this.form.controls.id_responsable.setValue(usuario?.id ?? '');
    this.selectedUsuario.set(usuario);
  }

  /** En una orden nueva, el responsable es el usuario con sesión abierta. */
  private precargarResponsableDeSesion(): void {
    if (this.orden() || this.form.controls.id_responsable.value) {
      return;
    }
    const username = this.authService.currentUsername().trim().toUpperCase();
    if (!username) return;

    this.usuarioService.findPaginated(0, 10, username).subscribe({
      next: (res) => {
        if (this.orden() || this.form.controls.id_responsable.value) return;
        const found = (res.content ?? []).find(
          (u) => (u.username ?? '').trim().toUpperCase() === username
        );
        if (!found) return;
        this.usuarios.update((list) => this.ensureInList(list, found, (u) => u.id));
        this.onUsuarioSelected(found);
      },
    });
  }

  private sectionStatus(controls: string[]): OtSectionStatus {
    this.formTick();
    this.formValue();
    let hasError = false;
    let allValid = true;
    for (const name of controls) {
      const ctrl = this.form.get(name);
      if (!ctrl) continue;
      if (ctrl.invalid) {
        allValid = false;
        if (ctrl.touched) hasError = true;
      }
    }
    if (hasError) return 'error';
    if (allValid) return 'ok';
    return 'pending';
  }

  private abrirHistorial(idVehiculo: string | null): void {
    this.historialPageIndex.set(0);
    if (!idVehiculo) {
      this.historialSeq += 1;
      this.historial.set([]);
      this.historialTotal.set(0);
      this.historialLoading.set(false);
      return;
    }
    this.cargarHistorial(idVehiculo, 0, this.historialPageSize());
  }

  private cargarHistorial(idVehiculo: string, page: number, size: number): void {
    const seq = ++this.historialSeq;
    this.historialLoading.set(true);
    this.ordenService.findByVehiculo(idVehiculo, page, size).subscribe({
      next: (res) => {
        if (seq !== this.historialSeq) return;
        const propia = this.ordenId;
        const mismoVehiculo =
          !!propia && String(this.orden()?.vehiculo?.id_bien ?? '') === String(idVehiculo);
        const content = (res?.content ?? []).filter((orden) => orden.id_orden_trabajo !== propia);
        const total = Math.max(0, (res?.pageInfo?.totalElements ?? 0) - (mismoVehiculo ? 1 : 0));
        this.historial.set(content);
        this.historialTotal.set(total);
        this.historialLoading.set(false);
      },
      error: () => {
        if (seq !== this.historialSeq) return;
        this.historial.set([]);
        this.historialTotal.set(0);
        this.historialLoading.set(false);
      },
    });
  }

  private formatFecha(fecha?: string | null): string {
    if (!fecha) return '—';
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return fecha;
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatMonto(value?: number | null): string {
    if (value == null) return '—';
    return `${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value)} ₲`;
  }

  private ensureInList<T>(list: T[], item: T, keyFn: (item: T) => unknown): T[] {
    const key = keyFn(item);
    if (key == null || key === '') return list;
    if (list.some((x) => keyFn(x) === key)) return list;
    return [item, ...list];
  }

  private clienteLabel(c: ClienteOutput | null): string {
    if (!c) return '';
    return `${nombreCompletoPersona(c.persona)} (${c.persona?.documento ?? ''})`;
  }

  private vehiculoLabel(v: VehiculoOutput | null): string {
    if (!v) return '';
    return `${v.marca ?? ''} ${v.modelo ?? ''} - ${v.chapa ?? ''}`.trim();
  }

  private mecanicoLabel(f: FuncionarioOutput | null): string {
    if (!f) return '';
    return nombreCompletoPersona(f.persona) || 'Desconocido';
  }
}
