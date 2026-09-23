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
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom, map, startWith } from 'rxjs';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';
import { VehiculoService } from '../../../../activos/vehiculos/services/vehiculo.service';
import { VehiculoOutput } from '../../../../activos/vehiculos/interfaces/vehiculo.interface';
import { VehiculoFormComponent } from '../../../../activos/vehiculos/dialogs/vehiculo-form/vehiculo-form';
import { FuncionarioService } from '../../../../personas/funcionarios/services/funcionario.service';
import { FuncionarioOutput } from '../../../../personas/funcionarios/interfaces/funcionario.interface';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { SectorFormComponent } from '../../../../sectores/dialogs/sector-form/sector-form.component';
import { UltimoSectorStore } from '../../../../sectores/services/ultimo-sector.store';
import { UsuarioService } from '../../../../personas/usuarios/services/usuario.service';
import { UsuarioOutput } from '../../../../personas/usuarios/interfaces/usuario.interface';
import { AuthService } from '../../../../../core/auth/auth.service';
import { OrdenTrabajoInput, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OtHistorialPanelComponent } from '../ot-historial-panel/ot-historial-panel.component';
import {
  OtCollapsibleSectionComponent,
  OtSectionStatus,
} from '../ot-collapsible-section/ot-collapsible-section.component';

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
    UiButtonComponent,
    OtCollapsibleSectionComponent,
    OtHistorialPanelComponent,
  ],
  templateUrl: './ot-recepcion-step.component.html',
  styleUrls: ['../../styles/ot-form.scss', './ot-recepcion-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtRecepcionStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(AppDialogService);
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly sectorService = inject(SectorService);
  private readonly ultimoSector = inject(UltimoSectorStore);
  private readonly usuarioService = inject(UsuarioService);
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly orden = input<OrdenTrabajoOutput | null>(null);
  readonly soloLectura = input(false);
  readonly formReady = output<FormGroup>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly estadoGuardado = signal<'idle' | 'guardando' | 'guardado'>('idle');

  protected readonly openClienteVehiculo = signal(true);
  protected readonly openDatos = signal(true);
  protected readonly openFalla = signal(true);
  protected readonly openEstado = signal(false);

  /** Fuerza recomputo de badges cuando se marca touched al avanzar. */
  private readonly formTick = signal(0);
  private hidratado = false;
  private ordenId: string | null = null;
  private ultimoGuardado = '';
  private saveChain: Promise<void> = Promise.resolve();

  protected readonly historial = signal<OrdenTrabajoOutput[]>([]);
  protected readonly historialLoading = signal(false);
  protected readonly historialAbierto = signal(false);

  protected readonly selectedCliente = signal<ClienteOutput | null>(null);
  protected readonly selectedVehiculo = signal<VehiculoOutput | null>(null);
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
    id_vehiculo: ['', Validators.required],
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

  private readonly historialKeys = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map((v) => ({
        idCliente: (v.id_cliente as string) || null,
        idVehiculo: (v.id_vehiculo as string) || null,
      })),
      distinctUntilChanged(
        (a, b) => a.idCliente === b.idCliente && a.idVehiculo === b.idVehiculo
      )
    ),
    { initialValue: { idCliente: null as string | null, idVehiculo: null as string | null } }
  );

  protected readonly resumenClienteVehiculo = computed(() => {
    this.formValue();
    const cliente = this.selectedCliente();
    const vehiculo = this.selectedVehiculo();
    const parts: string[] = [];
    if (cliente) parts.push(this.clienteLabel(cliente));
    if (vehiculo) parts.push(this.vehiculoLabel(vehiculo));
    return parts.length ? parts.join(' · ') : 'Sin seleccionar';
  });

  protected readonly resumenDatos = computed(() => {
    this.formValue();
    const parts: string[] = [];
    const sector = this.selectedSector();
    const usuario = this.selectedUsuario();
    const mecanicos = this.selectedMecanicos();
    if (sector?.nombre) parts.push(sector.nombre);
    if (usuario) parts.push(this.usuarioLabelFn(usuario));
    if (mecanicos.length) {
      parts.push(mecanicos.map((m) => this.mecanicoLabel(m)).join(', '));
    }
    return parts.length ? parts.join(' · ') : 'Sin asignar';
  });

  protected readonly resumenFalla = computed(() => {
    const v = this.formValue();
    const text = (v.descripcion_falla ?? '').trim();
    if (!text) return 'Sin descripción';
    return text.length > 90 ? `${text.slice(0, 90)}…` : text;
  });

  protected readonly resumenEstado = computed(() => {
    const v = this.formValue();
    const fallas = this.opcionesEstado.filter(
      (o) => o.group === 'falla' && !!(v as Record<string, unknown>)[o.control]
    ).length;
    const condiciones = this.opcionesEstado.filter(
      (o) => o.group === 'condicion' && !!(v as Record<string, unknown>)[o.control]
    ).length;
    const parts: string[] = [];
    if (fallas) parts.push(`${fallas} falla${fallas > 1 ? 's' : ''}`);
    if (condiciones) parts.push(`${condiciones} condición${condiciones > 1 ? 'es' : ''}`);
    const km = v.kilometraje;
    if (km !== null && km !== undefined && String(km).trim() !== '') {
      const n = Number(km);
      if (!Number.isNaN(n)) {
        parts.push(`${n.toLocaleString('es-PY')} km`);
      }
    }
    const nivel = this.nivelesCombustible.find((n) => n.value === (v.nivel_combustible || ''));
    if (nivel?.value) parts.push(nivel.label);
    return parts.length ? parts.join(' · ') : 'Sin registrar';
  });

  protected readonly statusClienteVehiculo = computed(() =>
    this.sectionStatus(['id_cliente', 'id_vehiculo'])
  );
  protected readonly statusDatos = computed(() =>
    this.sectionStatus(['id_sector', 'id_responsable', 'ids_mecanicos'])
  );
  protected readonly statusFalla = computed(() => this.sectionStatus(['descripcion_falla']));
  protected readonly statusEstado = computed((): OtSectionStatus => {
    this.formTick();
    this.formValue();
    return this.resumenEstado() === 'Sin registrar' ? 'none' : 'ok';
  });

  protected readonly puedeVerHistorial = computed(() => {
    this.formValue();
    return !!(this.form.controls.id_cliente.value || this.form.controls.id_vehiculo.value);
  });

  protected readonly historialCount = computed(() => this.historial().length);

  protected readonly historialLabel = computed(() => {
    if (this.historialAbierto()) return 'Ocultar historial';
    if (!this.puedeVerHistorial()) return 'Ver historial';
    if (this.historialLoading()) return 'Ver historial…';
    return `Ver historial (${this.historialCount()})`;
  });

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly clientesTotal = signal(0);
  protected readonly loadingClientes = signal(false);
  protected readonly clienteColumns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'CI/RUC', value: (c) => c.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre', value: (c) => this.clienteLabel(c) },
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

  protected readonly mecanicos = signal<FuncionarioOutput[]>([]);
  protected readonly mecanicosTotal = signal(0);
  protected readonly loadingMecanicos = signal(false);
  protected readonly mecanicoColumns: TableColumn<FuncionarioOutput>[] = [
    { key: 'documento', header: 'CI', value: (f) => f.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre', value: (f) => this.mecanicoLabel(f) },
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
      header: 'Nombre',
      value: (u) =>
        `${u.funcionario?.persona?.nombre ?? ''} ${u.funcionario?.persona?.apellido ?? ''}`.trim(),
    },
  ];
  protected readonly usuarioLabelFn = (u: UsuarioOutput) =>
    u.username ??
    `${u.funcionario?.persona?.nombre ?? ''} ${u.funcionario?.persona?.apellido ?? ''}`.trim();
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
      const { idCliente, idVehiculo } = this.historialKeys();
      if (idVehiculo) {
        this.cargarHistorialPorVehiculo(idVehiculo);
      } else if (idCliente) {
        this.cargarHistorialPorCliente(idCliente);
      } else {
        this.historial.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.formReady.emit(this.form);
    this.fetchClientes(0, 10, '');
    this.fetchVehiculos(0, 10, '');
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
      this.revealInvalidSections();
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

    return {
      id_sector: v.id_sector,
      id_responsable: v.id_responsable,
      id_cliente: v.id_cliente,
      id_vehiculo: v.id_vehiculo,
      id_mecanico: v.ids_mecanicos[0] ?? v.id_mecanico ?? null,
      ids_mecanicos: v.ids_mecanicos,
      recepcion: {
        descripcion_falla: v.descripcion_falla,
      },
      estado_vehiculo: {
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

  protected toggleHistorial(): void {
    if (!this.puedeVerHistorial() && !this.historialAbierto()) return;
    this.historialAbierto.update((abierto) => !abierto);
  }

  protected cerrarHistorial(): void {
    this.historialAbierto.set(false);
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
    this.form.patchValue({
      id_sector: data.sector?.id_sector ? String(data.sector.id_sector) : '',
      id_responsable: data.responsable?.id ? String(data.responsable.id) : '',
      id_cliente: data.cliente?.id_cliente ?? '',
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
    this.fetchVehiculos(0, 10, '');
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

  private revealInvalidSections(): void {
    if (this.form.controls.id_cliente.invalid || this.form.controls.id_vehiculo.invalid) {
      this.openClienteVehiculo.set(true);
    }
    if (
      this.form.controls.id_sector.invalid ||
      this.form.controls.id_responsable.invalid ||
      this.form.controls.ids_mecanicos.invalid
    ) {
      this.openDatos.set(true);
    }
    if (this.form.controls.descripcion_falla.invalid) {
      this.openFalla.set(true);
    }
  }

  private cargarHistorialPorCliente(id: string): void {
    this.historialLoading.set(true);
    this.ordenService.findByCliente(id, 0, 8).subscribe({
      next: (list) => {
        this.historial.set(list);
        this.historialLoading.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.historialLoading.set(false);
      },
    });
  }

  private cargarHistorialPorVehiculo(id: string): void {
    this.historialLoading.set(true);
    this.ordenService.findByVehiculo(id, 0, 8).subscribe({
      next: (list) => {
        this.historial.set(list);
        this.historialLoading.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.historialLoading.set(false);
      },
    });
  }

  private ensureInList<T>(list: T[], item: T, keyFn: (item: T) => unknown): T[] {
    const key = keyFn(item);
    if (key == null || key === '') return list;
    if (list.some((x) => keyFn(x) === key)) return list;
    return [item, ...list];
  }

  private clienteLabel(c: ClienteOutput | null): string {
    if (!c) return '';
    return `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim() +
      ` (${c.persona?.documento ?? ''})`;
  }

  private vehiculoLabel(v: VehiculoOutput | null): string {
    if (!v) return '';
    return `${v.marca ?? ''} ${v.modelo ?? ''} - ${v.chapa ?? ''}`.trim();
  }

  private mecanicoLabel(f: FuncionarioOutput | null): string {
    if (!f) return '';
    return `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim() || 'Desconocido';
  }
}
