import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
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
import { UsuarioService } from '../../../../personas/usuarios/services/usuario.service';
import { UsuarioOutput } from '../../../../personas/usuarios/interfaces/usuario.interface';
import { OrdenTrabajoInput, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtHistorialPanelComponent } from '../ot-historial-panel/ot-historial-panel.component';
import { OtAgendaMecanicoComponent } from '../ot-agenda-mecanico/ot-agenda-mecanico.component';

@Component({
  selector: 'app-ot-recepcion-step',
  imports: [
    ReactiveFormsModule,
    EntitySearcherComponent,
    OtHistorialPanelComponent,
    OtAgendaMecanicoComponent,
  ],
  templateUrl: './ot-recepcion-step.component.html',
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtRecepcionStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(AppDialogService);
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly sectorService = inject(SectorService);
  private readonly usuarioService = inject(UsuarioService);

  readonly orden = input<OrdenTrabajoOutput | null>(null);
  readonly formReady = output<FormGroup>();

  protected readonly form = this.fb.group({
    id_sector: ['', Validators.required],
    id_responsable: ['', Validators.required],
    id_cliente: ['', Validators.required],
    id_vehiculo: ['', Validators.required],
    id_mecanico: ['', Validators.required],
    descripcion_falla: ['', Validators.required],
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

  ngOnInit(): void {
    this.formReady.emit(this.form);
    this.patchFromOrden(this.orden());
    this.fetchClientes(0, 10, '');
    this.fetchVehiculos(0, 10, '');
    this.fetchMecanicos(0, 10, '');
    this.fetchSectores(0, 10, '');
    this.fetchUsuarios(0, 10, '');
  }

  /** Expone el input tipado para el padre. */
  buildInput(): OrdenTrabajoInput | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    const v = this.form.getRawValue();
    return {
      id_sector: v.id_sector,
      id_responsable: v.id_responsable,
      id_cliente: v.id_cliente,
      id_vehiculo: v.id_vehiculo,
      id_mecanico: v.id_mecanico,
      descripcion_falla: v.descripcion_falla,
    };
  }

  protected patchFromOrden(data: OrdenTrabajoOutput | null): void {
    if (!data) return;
    this.form.patchValue({
      id_sector: data.sector?.id_sector ? String(data.sector.id_sector) : '',
      id_responsable: data.responsable?.id ? String(data.responsable.id) : '',
      id_cliente: data.cliente?.id_cliente ?? '',
      id_vehiculo: data.vehiculo?.id_bien ?? '',
      id_mecanico: data.mecanico?.id_funcionario ?? '',
      descripcion_falla: data.descripcion_falla || '',
    });
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
    this.form.controls.id_vehiculo.setValue('');
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
  }

  protected onAddVehiculo(): void {
    const idCliente = this.form.controls.id_cliente.value;
    const cliente = this.clientes().find((c) => c.id_cliente === idCliente) ?? null;
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
        this.mecanicos.set(res.content);
        this.mecanicosTotal.set(res.pageInfo.totalElements);
        this.loadingMecanicos.set(false);
      },
      error: () => this.loadingMecanicos.set(false),
    });
  }

  protected onMecanicoSelected(mecanico: FuncionarioOutput | null): void {
    this.form.controls.id_mecanico.setValue(mecanico?.id_funcionario ?? '');
  }

  protected fetchSectores(page: number, size: number, filter: string): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.sectores.set(res.content);
        this.sectoresTotal.set(res.pageInfo.totalElements);
        this.loadingSectores.set(false);
      },
      error: () => this.loadingSectores.set(false),
    });
  }

  protected onSectorSelected(sector: SectorOutput | null): void {
    this.form.controls.id_sector.setValue(
      sector?.id_sector != null ? String(sector.id_sector) : ''
    );
  }

  protected fetchUsuarios(page: number, size: number, filter: string): void {
    this.loadingUsuarios.set(true);
    this.usuarioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.usuarios.set(res.content);
        this.usuariosTotal.set(res.pageInfo.totalElements);
        this.loadingUsuarios.set(false);
      },
      error: () => this.loadingUsuarios.set(false),
    });
  }

  protected onUsuarioSelected(usuario: UsuarioOutput | null): void {
    this.form.controls.id_responsable.setValue(usuario?.id ?? '');
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
