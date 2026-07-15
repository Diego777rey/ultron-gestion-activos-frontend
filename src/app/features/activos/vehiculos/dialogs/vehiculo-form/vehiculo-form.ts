import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { VehiculoInput, VehiculoOutput } from '../../interfaces/vehiculo.interface';
import { VehiculoService } from '../../services/vehiculo.service';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';
import { ClienteOutput } from '../../../../personas/clientes/interfaces/cliente.interface';
import { ClienteFormComponent } from '../../../../personas/clientes/dialogs/cliente-form/cliente-form';

@Component({
  selector: 'app-vehiculo-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective, EntitySearcherComponent],
  templateUrl: './vehiculo-form.html',
  styleUrl: './vehiculo-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly clienteService = inject(ClienteService);
  private readonly dialogService = inject(AppDialogService);

  readonly vehiculo = input<VehiculoOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  // Indica que se tipeó un documento pero no existe cliente registrado con él.
  protected readonly clienteNoEncontrado = signal(false);

  // Estado del buscador genérico de clientes (paginación en backend).
  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly selectedCliente = signal<ClienteOutput | null>(null);
  protected readonly clientesTotal = signal<number>(0);
  protected readonly clientesPage = signal<number>(0);
  protected readonly clientesPageSize = signal<number>(10);
  protected readonly clientesFilter = signal<string>('');
  protected readonly loadingClientes = signal<boolean>(false);

  protected readonly clienteColumns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'CI/RUC', value: (c) => c.persona?.documento ?? '' },
    { key: 'nombre', header: 'Nombre Completo', value: (c) => this.clienteLabel(c) },
  ];

  protected readonly clientesDisponibles = computed(() => {
    const list = this.clientes();
    const selected = this.selectedCliente();
    if (selected && !list.find((c) => c.id_cliente === selected.id_cliente)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly form = this.fb.nonNullable.group({
    chapa: ['', [Validators.required, Validators.maxLength(20)]],
    marca: ['', [Validators.required, Validators.maxLength(50)]],
    modelo: ['', [Validators.required, Validators.maxLength(50)]],
    tipo_vehiculo: ['', [Validators.required, Validators.maxLength(50)]],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
    descripcion: [''],
    valor: [0, [Validators.min(0)]],
    id_cliente: ['', [Validators.required]],
    cliente_doc: [''],
    estado: ['ACTIVO'],
  });

  constructor() {
    effect(() => {
      const v = this.vehiculo();
      if (v) {
        this.isEdit = !!v.id_bien;
        if (v.cliente) {
          this.selectedCliente.set(v.cliente);
        }
        this.clienteNoEncontrado.set(false);
        this.form.patchValue({
          chapa: v.chapa ?? '',
          marca: v.marca ?? '',
          modelo: v.modelo ?? '',
          tipo_vehiculo: v.tipo_vehiculo ?? '',
          anio: v.anio ?? new Date().getFullYear(),
          descripcion: v.descripcion ?? '',
          valor: v.valor ?? 0,
          id_cliente: v.cliente?.id_cliente ?? '',
          cliente_doc: v.cliente?.persona?.documento ?? '',
        }, { emitEvent: false });
        this.form.controls.estado.setValue(v.estado ?? 'ACTIVO', { emitEvent: false });
      } else {
        this.isEdit = false;
        this.selectedCliente.set(null);
        this.clienteNoEncontrado.set(false);
        this.form.reset({
          chapa: '',
          marca: '',
          modelo: '',
          tipo_vehiculo: '',
          anio: new Date().getFullYear(),
          descripcion: '',
          valor: 0,
          id_cliente: '',
          cliente_doc: '',
          estado: 'ACTIVO',
        }, { emitEvent: false });
      }
    });

    // Autocompletado del cliente al tipear su documento (CI/RUC).
    this.form.controls.cliente_doc.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((doc) => {
        if (!doc || doc.trim().length === 0) return of(null);
        return this.clienteService.findPaginated(0, 1, doc.trim()).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe((data) => {
      const cliente = data?.content?.[0] ?? null;
      const docActual = (this.form.controls.cliente_doc.value ?? '').trim();
      if (cliente) {
        this.selectedCliente.set(cliente);
        this.clienteNoEncontrado.set(false);
        this.form.controls.id_cliente.setValue(cliente.id_cliente ?? '');
      } else {
        this.form.controls.id_cliente.setValue('');
        this.clienteNoEncontrado.set(docActual.length > 0);
      }
    });
  }

  ngOnInit(): void {
    this.fetchClientesPage(0, this.clientesPageSize());
  }

  protected fetchClientesPage(page: number, size: number, filter: string = ''): void {
    this.loadingClientes.set(true);
    this.clienteService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.clientes.set(response.content);
        this.clientesTotal.set(response.pageInfo.totalElements);
        this.clientesPage.set(page);
        this.clientesPageSize.set(size);
        this.clientesFilter.set(filter);
        this.loadingClientes.set(false);
      },
      error: () => {
        this.error = 'Error al cargar la lista de clientes';
        this.loadingClientes.set(false);
      },
    });
  }

  protected onClienteSearchChange(filter: string): void {
    this.fetchClientesPage(0, this.clientesPageSize(), filter);
  }

  protected onClientePageChange(event: PageChange): void {
    this.fetchClientesPage(event.pageIndex, event.pageSize, this.clientesFilter());
  }

  /** Selección desde el buscador: sincroniza el CI y el id sin re-disparar el lookup. */
  protected onClienteSelected(cliente: ClienteOutput | null): void {
    this.selectedCliente.set(cliente);
    this.clienteNoEncontrado.set(false);
    this.form.controls.id_cliente.setValue(cliente?.id_cliente ?? '');
    this.form.controls.cliente_doc.setValue(cliente?.persona?.documento ?? '', { emitEvent: false });
  }

  /** Abre el alta de cliente desde el buscador y lo selecciona al guardar. */
  protected onAddCliente(): void {
    this.dialogService.openForm(ClienteFormComponent, {
      title: 'Nuevo Cliente',
      subtitle: 'Completa los datos para registrar un cliente',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.fetchClientesPage(0, this.clientesPageSize(), '');
      }
    });
  }

  protected clienteLabel(c: ClienteOutput): string {
    const nombre = `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim();
    const doc = c.persona?.documento ?? '';
    return [nombre, doc].filter(Boolean).join(' — ') || `Cliente #${c.id_cliente}`;
  }

  protected readonly clienteLabelFn = (c: ClienteOutput) => this.clienteLabel(c);
  protected readonly clienteKeyFn = (c: ClienteOutput) => c.id_cliente;

  private readonly dialogRef = inject(DialogRef, { optional: true });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const vehiculoData = this.vehiculo();

    const payload: VehiculoInput = {
      id_cliente: v.id_cliente,
      chapa: v.chapa.trim(),
      marca: v.marca.trim(),
      modelo: v.modelo.trim(),
      tipo_vehiculo: v.tipo_vehiculo.trim(),
      anio: v.anio,
      descripcion: v.descripcion?.trim() || null,
      valor: v.valor,
      estado: v.estado,
    };

    this.saving = true;
    const request = (vehiculoData && vehiculoData.id_bien)
      ? this.vehiculoService.update(vehiculoData.id_bien, payload)
      : this.vehiculoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el vehículo';
      },
    });
  }
}
