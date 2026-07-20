import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { PresentacionProductoService } from '../../services/presentacion-producto.service';
import { PresentacionService } from '../../services/presentacion.service';
import { PresentacionProductoInput, PresentacionProductoOutput } from '../../interfaces/producto.interface';
import { PresentacionOutput } from '../../interfaces/presentacion.interface';
import { PresentacionCatalogoFormComponent } from '../presentacion-catalogo-form/presentacion-catalogo-form.component';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-presentacion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    UppercaseDirective,
    EntitySearcherComponent,
  ],
  templateUrl: './presentacion-form.component.html',
  styleUrl: './presentacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentacionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly presentacionProductoService = inject(PresentacionProductoService);
  private readonly presentacionService = inject(PresentacionService);
  private readonly dialogService = inject(AppDialogService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly idProducto = input<number | null>(null);
  readonly presentacion = input<PresentacionProductoOutput | null>(null);
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected isEdit = false;

  protected readonly presentaciones = signal<PresentacionOutput[]>([]);
  protected readonly selectedPresentacion = signal<PresentacionOutput | null>(null);
  protected readonly presentacionesTotal = signal(0);
  protected readonly presentacionesPage = signal(0);
  protected readonly presentacionesPageSize = signal(15);
  protected readonly presentacionesFilter = signal('');
  protected readonly loadingPresentaciones = signal(false);

  protected readonly presentacionColumns: TableColumn<PresentacionOutput>[] = [
    { key: 'id_presentacion', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (p) => p.nombre ?? '' },
    { key: 'descripcion', header: 'Descripción', value: (p) => p.descripcion ?? '' },
  ];

  protected readonly presentacionesDisponibles = computed(() => {
    const list = this.presentaciones();
    const selected = this.selectedPresentacion();
    if (selected && !list.find((p) => p.id_presentacion === selected.id_presentacion)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly form = this.fb.nonNullable.group({
    idPresentacion: [null as number | null, [Validators.required]],
    descripcion: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['', [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(0)]],
    precio: [0, [Validators.required, Validators.min(0)]],
    codigoBarras: [''],
    principal: [false],
    estado: [true],
  });

  constructor() {
    this.fetchPresentacionesPage(0, this.presentacionesPageSize());

    effect(() => {
      const p = this.presentacion();
      if (p) {
        this.isEdit = !!p.id_presentacion_producto;
        this.form.reset({
          idPresentacion: null,
          descripcion: p.descripcion,
          tipo: p.tipo ?? '',
          cantidad: p.cantidad ?? 1,
          precio: p.precio ?? 0,
          codigoBarras: p.codigoBarras ?? '',
          principal: p.principal ?? false,
          estado: p.estado ?? true,
        });
        this.resolveSelectedFromTipo(p.tipo);
      } else {
        this.isEdit = false;
        this.selectedPresentacion.set(null);
        this.form.reset({
          idPresentacion: null,
          descripcion: '',
          tipo: '',
          cantidad: 1,
          precio: 0,
          codigoBarras: '',
          principal: false,
          estado: true,
        });
      }
    });
  }

  private resolveSelectedFromTipo(tipo?: string): void {
    if (!tipo) {
      this.selectedPresentacion.set(null);
      return;
    }
    const match = this.presentaciones().find((p) => p.nombre === tipo);
    if (match) {
      this.selectedPresentacion.set(match);
      this.form.controls.idPresentacion.setValue(match.id_presentacion);
      return;
    }
    this.presentacionService.findPaginated(0, 50, tipo).subscribe({
      next: (response) => {
        const found = response.content.find((p) => p.nombre === tipo) ?? response.content[0] ?? null;
        this.selectedPresentacion.set(found);
        this.form.controls.idPresentacion.setValue(found?.id_presentacion ?? null);
      },
    });
  }

  protected fetchPresentacionesPage(page: number, size: number, filter = ''): void {
    this.loadingPresentaciones.set(true);
    this.presentacionService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.presentaciones.set(response.content);
        this.presentacionesTotal.set(response.pageInfo.totalElements);
        this.presentacionesPage.set(page);
        this.presentacionesPageSize.set(size);
        this.presentacionesFilter.set(filter);
        this.loadingPresentaciones.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las presentaciones');
        this.loadingPresentaciones.set(false);
      },
    });
  }

  protected onPresentacionSearchChange(filter: string): void {
    this.fetchPresentacionesPage(0, this.presentacionesPageSize(), filter);
  }

  protected onPresentacionPageChange(event: PageChange): void {
    this.fetchPresentacionesPage(event.pageIndex, event.pageSize, this.presentacionesFilter());
  }

  protected onPresentacionSelected(catalogo: PresentacionOutput | null): void {
    this.selectedPresentacion.set(catalogo);
    this.form.controls.idPresentacion.setValue(catalogo?.id_presentacion ?? null);
    this.form.controls.idPresentacion.markAsTouched();
    if (catalogo) {
      this.form.patchValue({
        tipo: catalogo.nombre,
        descripcion: catalogo.nombre,
      });
    } else {
      this.form.patchValue({
        tipo: '',
        descripcion: '',
      });
    }
  }

  protected onAddPresentacion(): void {
    this.dialogService
      .openForm(PresentacionCatalogoFormComponent, {
        title: 'Nueva Presentación',
        subtitle: 'Registrá un tipo de presentación',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.fetchPresentacionesPage(0, this.presentacionesPageSize(), '');
        }
      });
  }

  protected readonly presentacionLabelFn = (p: PresentacionOutput) =>
    p.nombre ?? `Presentación #${p.id_presentacion}`;
  protected readonly presentacionKeyFn = (p: PresentacionOutput) => p.id_presentacion;

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Por favor, completa correctamente todos los campos requeridos.');
      return;
    }

    const v = this.form.getRawValue();
    const p = this.presentacion();

    const payload: PresentacionProductoInput = {
      idProducto: this.idProducto() ?? undefined,
      descripcion: v.descripcion.trim(),
      tipo: v.tipo,
      cantidad: v.cantidad,
      precio: v.precio,
      codigoBarras: v.codigoBarras?.trim() || undefined,
      principal: v.principal,
      estado: v.estado,
    };

    this.saving.set(true);
    this.error.set(null);
    const request = (p && p.id_presentacion_producto)
      ? this.presentacionProductoService.update(p.id_presentacion_producto, payload)
      : this.presentacionProductoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar la presentación');
      },
    });
  }
}
