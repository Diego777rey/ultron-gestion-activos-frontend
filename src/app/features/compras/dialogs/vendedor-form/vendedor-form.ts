import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotifyErrorComponent } from '../../../../shared/components/notify-error/notify-error';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../shared/components/entity-searcher/entity-searcher';
import { UppercaseDirective } from '../../../../shared/directives/uppercase.directive';
import { ProveedorOutput, VendedorInput, VendedorOutput } from '../../../../shared/models/compras.model';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { VendedorService } from '../../../../shared/services/vendedor.service';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { PersonaService } from '../../../personas/shared/services/persona.service';
import { normalizarRuc } from '../../../personas/shared/services/consulta-ruc.service';
import { nombreCompletoPersona } from '../../../personas/shared/nombre-persona';
import { ProveedorFormComponent } from '../proveedor-form/proveedor-form';
import { nombreProveedor } from '../../shared/proveedor-presentacion';

function telefonoOCelular(control: AbstractControl): ValidationErrors | null {
  const telefono = String(control.get('telefono')?.value ?? '').trim();
  const celular = String(control.get('celular')?.value ?? '').trim();
  return telefono || celular ? null : { contacto: true };
}

@Component({
  selector: 'app-vendedor-form',
  imports: [
    NotifyErrorComponent,
    ReactiveFormsModule,
    UiButtonComponent,
    EntitySearcherComponent,
    UppercaseDirective,
  ],
  templateUrl: './vendedor-form.html',
  styleUrl: '../../../../shared/styles/entity-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendedorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vendedorService = inject(VendedorService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly dialogService = inject(AppDialogService);
  private readonly personaService = inject(PersonaService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly vendedor = input<VendedorOutput | null>(null);
  /** Proveedor preseleccionado al crear un vendedor (p. ej. desde una compra). */
  readonly proveedorInicial = input<number | null>(null);
  readonly saved = output<void>();

  protected readonly proveedores = signal<ProveedorOutput[]>([]);
  protected readonly loadingProveedores = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly personaEncontrada = signal(false);
  protected readonly isEdit = signal(false);

  protected readonly proveedorColumns: TableColumn<ProveedorOutput>[] = [
    { key: 'nombre', header: 'Proveedor', value: (proveedor) => nombreProveedor(proveedor) },
    { key: 'ruc', header: 'RUC', width: '160px' },
    { key: 'ciudad', header: 'Ciudad', width: '160px' },
  ];

  protected readonly form = this.fb.group(
    {
      idProveedor: this.fb.control<number | null>(null, Validators.required),
      documento: this.fb.nonNullable.control('', [Validators.maxLength(30)]),
      nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
      cargo: this.fb.nonNullable.control('', [Validators.maxLength(255)]),
      telefono: this.fb.nonNullable.control('', [Validators.maxLength(50)]),
      celular: this.fb.nonNullable.control('', [Validators.maxLength(50)]),
      email: this.fb.nonNullable.control('', [Validators.email, Validators.maxLength(255)]),
      activo: this.fb.nonNullable.control(true),
    },
    { validators: telefonoOCelular },
  );

  constructor() {
    this.cargarProveedores();

    this.form.controls.documento.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(500),
      map((documento) => documento.trim()),
      distinctUntilChanged(),
      switchMap((documento) => {
        const base = normalizarRuc(documento).replace(/-\d$/, '');
        if (!base || this.vendedor()) {
          return of(null);
        }
        return this.personaService.buscarPorDocumento(base).pipe(
          map((data) => data.buscarPersonaPorDocumento),
          catchError(() => of(null)),
        );
      }),
    ).subscribe((persona) => {
      if (this.vendedor()) {
        return;
      }
      if (!persona?.nombre) {
        this.personaEncontrada.set(false);
        return;
      }
      this.personaEncontrada.set(true);
      this.form.patchValue({
        documento: persona.documento?.trim() || this.form.controls.documento.value,
        nombre: nombreCompletoPersona(persona).toUpperCase(),
        telefono: persona.telefono?.trim() || this.form.controls.telefono.value,
        email: persona.email?.trim() || this.form.controls.email.value,
      }, { emitEvent: false });
    });

    effect(() => {
      const vendedor = this.vendedor();
      if (vendedor?.id_vendedor) {
        this.isEdit.set(true);
        this.form.reset({
          idProveedor: Number(vendedor.id_proveedor),
          documento: vendedor.documento ?? '',
          nombre: nombreCompletoPersona(vendedor),
          cargo: vendedor.cargo ?? '',
          telefono: vendedor.telefono ?? '',
          celular: vendedor.celular ?? '',
          email: vendedor.email ?? '',
          activo: vendedor.activo ?? true,
        });
        return;
      }

      this.isEdit.set(false);
      this.form.reset({
        idProveedor: this.proveedorInicial(),
        documento: '',
        nombre: '',
        cargo: '',
        telefono: '',
        celular: '',
        email: '',
        activo: true,
      });
    });
  }

  protected readonly proveedorLabel = (proveedor: ProveedorOutput): string => nombreProveedor(proveedor);
  protected readonly proveedorKey = (proveedor: ProveedorOutput): number => Number(proveedor.id_proveedor);
  protected readonly proveedorSearch = (proveedor: ProveedorOutput, consulta: string): boolean => {
    const texto = [nombreProveedor(proveedor), proveedor.ruc, proveedor.ciudad, proveedor.telefono]
      .filter((parte) => !!parte?.trim())
      .join(' ')
      .toLowerCase();
    return texto.includes(consulta);
  };

  protected onProveedorChange(id: unknown): void {
    const proveedorId = id == null || id === '' ? null : Number(id);
    this.form.controls.idProveedor.setValue(Number.isNaN(proveedorId) ? null : proveedorId);
    this.form.controls.idProveedor.markAsTouched();
  }

  protected onAddProveedor(): void {
    this.dialogService
      .openForm(ProveedorFormComponent, {
        title: 'Nuevo Proveedor',
        subtitle: 'Completa los datos para registrar un proveedor',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.cargarProveedores();
        }
      });
  }

  protected onSubmit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const payload: VendedorInput = {
      idProveedor: Number(valor.idProveedor),
      nombre: valor.nombre.trim(),
      apellido: '',
      documento: valor.documento.trim(),
      cargo: valor.cargo.trim(),
      telefono: valor.telefono.trim(),
      celular: valor.celular.trim(),
      email: valor.email.trim(),
      activo: valor.activo,
    };

    const vendedor = this.vendedor();
    this.saving.set(true);
    const request = vendedor?.id_vendedor
      ? this.vendedorService.update(vendedor.id_vendedor, payload)
      : this.vendedorService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el vendedor');
      },
    });
  }

  private cargarProveedores(): void {
    this.loadingProveedores.set(true);
    this.proveedorService.findAll().subscribe({
      next: (proveedores) => {
        this.proveedores.set(proveedores);
        this.loadingProveedores.set(false);
      },
      error: () => {
        this.loadingProveedores.set(false);
        this.error.set('No se pudieron cargar los proveedores');
      },
    });
  }
}
