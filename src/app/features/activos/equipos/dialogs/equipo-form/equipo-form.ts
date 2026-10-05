import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { VehiculoService } from '../../../vehiculos/services/vehiculo.service';
import { VehiculoOutput } from '../../../vehiculos/interfaces/vehiculo.interface';
import { EquipoService } from '../../services/equipo.service';
import { EquipoInput, EquipoOutput, TIPOS_EQUIPO } from '../../interfaces/equipo.interface';

@Component({
  selector: 'app-equipo-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective, EntitySearcherComponent],
  templateUrl: './equipo-form.html',
  styleUrl: '../../../vehiculos/dialogs/vehiculo-form/vehiculo-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly equipoService = inject(EquipoService);
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly dialogService = inject(AppDialogService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  /** Equipo a editar, o datos iniciales (cliente/vehículo) para uno nuevo. */
  readonly equipo = input<EquipoOutput | null>(null);
  readonly saved = output<EquipoOutput>();

  protected readonly tiposEquipo = TIPOS_EQUIPO;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = computed(() => !!this.equipo()?.id_equipo);

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly selectedCliente = signal<ClienteOutput | null>(null);
  protected readonly clientesTotal = signal(0);
  protected readonly clientesPageSize = signal(10);
  protected readonly loadingClientes = signal(false);
  private clientesFilter = '';

  protected readonly vehiculos = signal<VehiculoOutput[]>([]);
  protected readonly selectedVehiculo = signal<VehiculoOutput | null>(null);
  protected readonly loadingVehiculos = signal(false);

  protected readonly clienteColumns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'CI/RUC', value: (c) => c.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre Completo', value: (c) => nombreCompletoPersona(c.persona) },
  ];
  protected readonly vehiculoColumns: TableColumn<VehiculoOutput>[] = [
    { key: 'chapa', header: 'Chapa', value: (v) => v.chapa ?? '' },
    { key: 'vehiculo', header: 'Vehículo', value: (v) => this.vehiculoLabel(v) },
  ];

  protected readonly clientesDisponibles = computed(() => {
    const list = this.clientes();
    const selected = this.selectedCliente();
    return selected && !list.some((c) => c.id_cliente === selected.id_cliente) ? [selected, ...list] : list;
  });

  protected readonly vehiculosDisponibles = computed(() => {
    const list = this.vehiculos();
    const selected = this.selectedVehiculo();
    return selected && !list.some((v) => v.id_bien === selected.id_bien) ? [selected, ...list] : list;
  });

  protected readonly form = this.fb.nonNullable.group({
    id_cliente: ['', Validators.required],
    id_vehiculo: [''],
    tipo_equipo: ['', [Validators.required, Validators.maxLength(60)]],
    marca: ['', Validators.maxLength(80)],
    modelo: ['', Validators.maxLength(80)],
    numero_serie: ['', Validators.maxLength(100)],
    descripcion: ['', Validators.maxLength(255)],
    estado: ['ACTIVO'],
  });

  constructor() {
    effect(() => {
      const e = this.equipo();
      untracked(() => {
        this.selectedCliente.set(e?.cliente ?? null);
        this.selectedVehiculo.set(e?.vehiculo ?? null);
        this.form.reset({
          id_cliente: e?.cliente?.id_cliente ?? '',
          id_vehiculo: e?.vehiculo?.id_bien ?? '',
          tipo_equipo: e?.tipo_equipo ?? '',
          marca: e?.marca ?? '',
          modelo: e?.modelo ?? '',
          numero_serie: e?.numero_serie ?? '',
          descripcion: e?.descripcion ?? '',
          estado: e?.estado ?? 'ACTIVO',
        });
        this.fetchVehiculos();
      });
    });
  }

  ngOnInit(): void {
    this.fetchClientes(0, this.clientesPageSize());
  }

  protected fetchClientes(page: number, size: number, filter = this.clientesFilter): void {
    this.clientesFilter = filter;
    this.loadingClientes.set(true);
    this.clienteService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.clientes.set(res.content);
        this.clientesTotal.set(res.pageInfo.totalElements);
        this.clientesPageSize.set(size);
        this.loadingClientes.set(false);
      },
      error: () => this.loadingClientes.set(false),
    });
  }

  protected onClientePageChange(event: PageChange): void {
    this.fetchClientes(event.pageIndex, event.pageSize);
  }

  protected onClienteSelected(cliente: ClienteOutput | null): void {
    const cambio = cliente?.id_cliente !== this.form.controls.id_cliente.value;
    this.selectedCliente.set(cliente);
    this.form.controls.id_cliente.setValue(cliente?.id_cliente ?? '');
    if (cambio) {
      this.onVehiculoSelected(null);
      this.fetchVehiculos();
    }
  }

  protected onAddCliente(): void {
    this.dialogService
      .openForm(ClienteFormComponent, {
        title: 'Nuevo Cliente',
        subtitle: 'Completa los datos para registrar un cliente',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) this.fetchClientes(0, this.clientesPageSize(), '');
      });
  }

  /** Solo se ofrecen los vehículos del cliente elegido. */
  protected fetchVehiculos(): void {
    const idCliente = this.form.controls.id_cliente.value;
    if (!idCliente) {
      this.vehiculos.set([]);
      return;
    }
    this.loadingVehiculos.set(true);
    this.vehiculoService.findByCliente(idCliente, 100).subscribe({
      next: (list) => {
        this.vehiculos.set(list);
        this.loadingVehiculos.set(false);
      },
      error: () => this.loadingVehiculos.set(false),
    });
  }

  protected onVehiculoSelected(vehiculo: VehiculoOutput | null): void {
    this.selectedVehiculo.set(vehiculo);
    this.form.controls.id_vehiculo.setValue(vehiculo?.id_bien ?? '');
  }

  protected readonly clienteLabelFn = (c: ClienteOutput) =>
    [nombreCompletoPersona(c.persona), c.persona?.documento].filter(Boolean).join(' — ') ||
    `Cliente #${c.id_cliente}`;
  protected readonly clienteKeyFn = (c: ClienteOutput) => c.id_cliente;
  protected readonly vehiculoLabelFn = (v: VehiculoOutput) => this.vehiculoLabel(v);
  protected readonly vehiculoKeyFn = (v: VehiculoOutput) => v.id_bien;

  private vehiculoLabel(v: VehiculoOutput): string {
    const desc = [v.marca, v.modelo].filter(Boolean).join(' ');
    return v.chapa ? `${desc} - ${v.chapa}` : desc;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: EquipoInput = {
      id_cliente: v.id_cliente,
      id_vehiculo: v.id_vehiculo || null,
      tipo_equipo: v.tipo_equipo.trim(),
      marca: v.marca.trim() || null,
      modelo: v.modelo.trim() || null,
      numero_serie: v.numero_serie.trim() || null,
      descripcion: v.descripcion.trim() || null,
      estado: v.estado,
    };

    const id = this.equipo()?.id_equipo;
    this.saving.set(true);
    this.error.set(null);
    (id ? this.equipoService.update(id, payload) : this.equipoService.create(payload)).subscribe({
      next: (equipo) => {
        this.saving.set(false);
        this.saved.emit(equipo);
        this.dialogRef?.close(equipo);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el equipo');
      },
    });
  }
}
