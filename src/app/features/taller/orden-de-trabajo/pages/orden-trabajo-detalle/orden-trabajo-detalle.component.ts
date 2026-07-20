import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';

import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OrdenTrabajoOutput, ETAPAS_ORDEN, EtapaOrdenTrabajo } from '../../interfaces/orden-trabajo.interface';

import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';

import { VehiculoService } from '../../../../activos/vehiculos/services/vehiculo.service';
import { VehiculoOutput } from '../../../../activos/vehiculos/interfaces/vehiculo.interface';
import { VehiculoFormComponent } from '../../../../activos/vehiculos/dialogs/vehiculo-form/vehiculo-form';

import { FuncionarioService } from '../../../../personas/funcionarios/services/funcionario.service';
import { FuncionarioOutput } from '../../../../personas/funcionarios/interfaces/funcionario.interface';

interface StepDef {
  index: number;
  etapa: EtapaOrdenTrabajo;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-orden-trabajo-detalle',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiButtonComponent, EntitySearcherComponent],
  templateUrl: './orden-trabajo-detalle.component.html',
  styleUrl: './orden-trabajo-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenTrabajoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(AppDialogService);
  private readonly ordenService = inject(OrdenTrabajoService);
  
  private readonly clienteService = inject(ClienteService);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly funcionarioService = inject(FuncionarioService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  
  protected readonly orden = signal<OrdenTrabajoOutput | null>(null);
  protected readonly isEdit = signal(false);

  protected readonly steps: StepDef[] = [
    { index: 1, etapa: 'RECEPCION', label: 'Recepción', icon: 'login' },
    { index: 2, etapa: 'DIAGNOSTICO', label: 'Diagnóstico', icon: 'search' },
    { index: 3, etapa: 'EN_PROCESO', label: 'En Proceso', icon: 'build' },
    { index: 4, etapa: 'FINALIZADA', label: 'Finalizada', icon: 'check_circle' },
    { index: 5, etapa: 'FACTURADO', label: 'Facturado', icon: 'receipt' },
  ];

  protected readonly currentStep = computed(() => {
    const o = this.orden();
    if (!o || !o.etapa) return 1;
    const step = this.steps.find(s => s.etapa === o.etapa);
    return step ? step.index : 1;
  });

  protected readonly tituloPaso = computed(() => {
    const step = this.steps.find(s => s.index === this.currentStep());
    return step ? step.label : '';
  });

  // Formularios
  protected recepcionForm = this.fb.group({
    id_cliente: ['', Validators.required],
    id_vehiculo: ['', Validators.required],
    id_mecanico: ['', Validators.required],
    descripcion_falla: ['', Validators.required],
    id_sector: [''],
    id_responsable: [''],
  });

  // Búsqueda de Cliente
  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly selectedCliente = signal<ClienteOutput | null>(null);
  protected readonly clientesTotal = signal(0);
  protected readonly loadingClientes = signal(false);
  protected readonly clienteColumns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'CI/RUC', value: (c) => c.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre', value: (c) => this.clienteLabel(c) },
  ];

  // Búsqueda de Vehículo
  protected readonly vehiculos = signal<VehiculoOutput[]>([]);
  protected readonly selectedVehiculo = signal<VehiculoOutput | null>(null);
  protected readonly vehiculosTotal = signal(0);
  protected readonly loadingVehiculos = signal(false);
  protected readonly vehiculoColumns: TableColumn<VehiculoOutput>[] = [
    { key: 'chapa', header: 'Chapa', value: (v) => v.chapa ?? '' },
    { key: 'vehiculo', header: 'Vehículo', value: (v) => this.vehiculoLabel(v) },
  ];

  // Búsqueda de Mecánico
  protected readonly mecanicos = signal<FuncionarioOutput[]>([]);
  protected readonly selectedMecanico = signal<FuncionarioOutput | null>(null);
  protected readonly mecanicosTotal = signal(0);
  protected readonly loadingMecanicos = signal(false);
  protected readonly mecanicoColumns: TableColumn<FuncionarioOutput>[] = [
    { key: 'documento', header: 'CI', value: (f) => f.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre', value: (f) => this.mecanicoLabel(f) },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.cargarOrden(id);
    } else {
      this.isEdit.set(false);
    }
    this.fetchClientes(0, 10, '');
    this.fetchVehiculos(0, 10, '');
    this.fetchMecanicos(0, 10, '');
  }

  private cargarOrden(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.ordenService.findById(id).subscribe({
      next: (data) => {
        this.orden.set(data);
        this.loading.set(false);
        if (data) {
          this.patchRecepcion(data);
        }
      },
      error: (err) => {
        this.error.set('No se pudo cargar la orden. ' + err.message);
        this.loading.set(false);
      }
    });
  }

  private patchRecepcion(data: OrdenTrabajoOutput): void {
    if (data.cliente) {
      this.selectedCliente.set(data.cliente);
      this.recepcionForm.controls.id_cliente.setValue(data.cliente.id_cliente ?? '');
    }
    if (data.vehiculo) {
      this.selectedVehiculo.set(data.vehiculo);
      this.recepcionForm.controls.id_vehiculo.setValue(data.vehiculo.id_bien ?? '');
    }
    // Mapping FuncionarioResumen to FuncionarioOutput is slightly incompatible, we do a basic cast or lookup here
    if (data.mecanico) {
      const mec = data.mecanico as unknown as FuncionarioOutput;
      this.selectedMecanico.set(mec);
      this.recepcionForm.controls.id_mecanico.setValue(data.mecanico.id_funcionario ?? '');
    }
    
    this.recepcionForm.patchValue({
      descripcion_falla: data.descripcion_falla || '',
      id_sector: data.sector?.id_sector || '',
      id_responsable: data.responsable?.id || ''
    });
  }
  
  protected cancelar(): void {
    this.router.navigate(['/taller/orden-de-trabajo']);
  }

  protected guardarRecepcion(): void {
    if (this.recepcionForm.invalid) {
      this.recepcionForm.markAllAsTouched();
      return;
    }
    
    this.saving.set(true);
    this.error.set(null);
    const formValue = this.recepcionForm.getRawValue();
    
    const input: any = {
      id_cliente: formValue.id_cliente,
      id_vehiculo: formValue.id_vehiculo,
      id_mecanico: formValue.id_mecanico,
      descripcion_falla: formValue.descripcion_falla,
      // Sector and responsable can be optional or taken from session, keeping empty for now if not set
    };
    if (formValue.id_sector) input.id_sector = formValue.id_sector;
    if (formValue.id_responsable) input.id_responsable = formValue.id_responsable;

    const request$ = this.isEdit() && this.orden()?.id_orden_trabajo
      ? this.ordenService.update(this.orden()!.id_orden_trabajo!, input)
      : this.ordenService.create(input);

    request$.subscribe({
      next: (data) => {
        this.orden.set(data);
        this.isEdit.set(true);
        // Avanzar a diagnóstico si la orden estaba en recepción
        if (data.etapa === 'RECEPCION') {
          this.ordenService.cambiarEtapa(data.id_orden_trabajo!, 'DIAGNOSTICO').subscribe({
            next: (dataAdv) => {
              this.orden.set(dataAdv);
              this.saving.set(false);
              // Podríamos hacer scroll hacia arriba u otras acciones UI
            },
            error: (errAdv) => {
              this.error.set('Orden creada, pero error al avanzar etapa: ' + errAdv.message);
              this.saving.set(false);
            }
          });
        } else {
          this.saving.set(false);
        }
      },
      error: (err) => {
        this.error.set('No se pudo guardar la orden. ' + err.message);
        this.saving.set(false);
      }
    });
  }

  // --- CLIENTE SEARCH ---
  protected fetchClientes(page: number, size: number, filter: string): void {
    this.loadingClientes.set(true);
    this.clienteService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        console.log('fetchClientes result:', res);
        this.clientes.set(res.content);
        this.clientesTotal.set(res.pageInfo.totalElements);
        this.loadingClientes.set(false);
      },
      error: (err) => {
        console.error('fetchClientes error:', err);
        this.loadingClientes.set(false);
      }
    });
  }

  protected onClienteSelected(cliente: ClienteOutput | null): void {
    this.selectedCliente.set(cliente);
    this.recepcionForm.controls.id_cliente.setValue(cliente?.id_cliente ?? '');
    
    // Auto-filter vehicles by selected client if needed
    if (cliente) {
      this.fetchVehiculos(0, 10, '');
    }
  }

  protected onAddCliente(): void {
    this.dialogService.openForm(ClienteFormComponent, {
      title: 'Nuevo Cliente',
      subtitle: 'Completa los datos para registrar un cliente',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.fetchClientes(0, 10, '');
      }
    });
  }

  protected clienteLabel(c: ClienteOutput | null): string {
    if (!c) return '';
    const nombre = `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim();
    return `${nombre} (${c.persona?.documento ?? ''})`;
  }
  
  protected readonly clienteLabelFn = (c: ClienteOutput) => this.clienteLabel(c);
  protected readonly clienteKeyFn = (c: ClienteOutput) => c.id_cliente;

  // --- VEHICULO SEARCH ---
  protected fetchVehiculos(page: number, size: number, filter: string): void {
    this.loadingVehiculos.set(true);
    
    const idCliente = this.recepcionForm.controls.id_cliente.value;
    
    if (idCliente) {
      // Fetch vehicles specific to the selected client
      this.vehiculoService.findByCliente(idCliente, 100).subscribe({
        next: (vehiculos) => {
          console.log('fetchVehiculos by cliente result:', vehiculos);
          // Apply local filter on top of the client's vehicles if they typed something
          const filtered = filter 
            ? vehiculos.filter(v => 
                (v.chapa?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                (v.marca?.toLowerCase() || '').includes(filter.toLowerCase()) ||
                (v.modelo?.toLowerCase() || '').includes(filter.toLowerCase())
              )
            : vehiculos;
            
          this.vehiculos.set(filtered);
          this.vehiculosTotal.set(filtered.length);
          this.loadingVehiculos.set(false);
        },
        error: (err) => {
          console.error('fetchVehiculos by cliente error:', err);
          this.loadingVehiculos.set(false);
        }
      });
    } else {
      // Global vehicle search
      this.vehiculoService.findPaginated(page, size, filter).subscribe({
        next: (res) => {
          console.log('fetchVehiculos global result:', res);
          this.vehiculos.set(res.content);
          this.vehiculosTotal.set(res.pageInfo.totalElements);
          this.loadingVehiculos.set(false);
        },
        error: (err) => {
          console.error('fetchVehiculos global error:', err);
          this.loadingVehiculos.set(false);
        }
      });
    }
  }

  protected onVehiculoSelected(vehiculo: VehiculoOutput | null): void {
    this.selectedVehiculo.set(vehiculo);
    this.recepcionForm.controls.id_vehiculo.setValue(vehiculo?.id_bien ?? '');
  }

  protected onAddVehiculo(): void {
    this.dialogService.openForm(VehiculoFormComponent, {
      title: 'Nuevo Vehículo',
      subtitle: 'Registra un nuevo vehículo',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.fetchVehiculos(0, 10, '');
      }
    });
  }

  protected vehiculoLabel(v: VehiculoOutput | null): string {
    if (!v) return '';
    return `${v.marca ?? ''} ${v.modelo ?? ''} - ${v.chapa ?? ''}`.trim();
  }
  
  protected readonly vehiculoLabelFn = (v: VehiculoOutput) => this.vehiculoLabel(v);
  protected readonly vehiculoKeyFn = (v: VehiculoOutput) => v.id_bien;

  // --- MECANICO SEARCH ---
  protected fetchMecanicos(page: number, size: number, filter: string): void {
    this.loadingMecanicos.set(true);
    // Assuming FuncionarioService has findPaginated (Generic CRUD)
    this.funcionarioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        console.log('fetchMecanicos result:', res);
        this.mecanicos.set(res.content);
        this.mecanicosTotal.set(res.pageInfo.totalElements);
        this.loadingMecanicos.set(false);
      },
      error: (err) => {
        console.error('fetchMecanicos error:', err);
        this.loadingMecanicos.set(false);
      }
    });
  }

  protected onMecanicoSelected(mecanico: FuncionarioOutput | null): void {
    this.selectedMecanico.set(mecanico);
    this.recepcionForm.controls.id_mecanico.setValue(mecanico?.id_funcionario ?? '');
  }

  protected mecanicoLabel(f: FuncionarioOutput | null): string {
    if (!f) return '';
    const nombre = `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim();
    return nombre || 'Desconocido';
  }
  
  protected readonly mecanicoLabelFn = (f: FuncionarioOutput) => this.mecanicoLabel(f);
  protected readonly mecanicoKeyFn = (f: FuncionarioOutput) => f.id_funcionario;
}
