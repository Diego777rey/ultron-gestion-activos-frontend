import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ClienteService } from '../../services/cliente.service';
import { PersonaService } from '../../../shared/services/persona.service';
@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);

  readonly cliente = input<ClienteOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly tiposCliente = ['Persona Física', 'Empresa', 'Gobierno'];

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.maxLength(80)]],
    documento: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', [Validators.email]],
    telefono: [''],
    direccion: [''],
    ruc: [''],
    tipoCliente: ['Persona Física'],
    observaciones: [''],
    estado: [true],
  });

  private readonly personaService = inject(PersonaService);

  constructor() {
    effect(() => {
      const c = this.cliente();
      if (c) {
        this.isEdit = !!c.id_cliente;
        this.form.reset({
          nombre: c.persona?.nombre ?? '',
          apellido: c.persona?.apellido ?? '',
          documento: c.persona?.documento ?? '',
          email: c.persona?.email ?? '',
          telefono: c.persona?.telefono ?? '',
          direccion: c.persona?.direccion ?? '',
          ruc: c.ruc ?? '',
          tipoCliente: c.tipoCliente ?? 'Persona Física',
          observaciones: c.observaciones ?? '',
          estado: c.estado ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          apellido: '',
          documento: '',
          email: '',
          telefono: '',
          direccion: '',
          ruc: '',
          tipoCliente: 'Persona Física',
          observaciones: '',
          estado: true,
        });
      }
    });

    this.form.controls.documento.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(doc => {
        if (!doc || doc.trim().length === 0) return of(null);
        return this.personaService.buscarPorDocumento(doc).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(data => {
      const persona = data?.buscarPersonaPorDocumento;
      if (persona && !this.isEdit) {
        this.form.patchValue({
          nombre: persona.nombre || '',
          apellido: persona.apellido || '',
          email: persona.email || '',
          telefono: persona.telefono || '',
          direccion: persona.direccion || ''
        });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const c = this.cliente();
    const isUpdate = !!(c && c.id_cliente);
    const payload: ClienteInput = {
      persona: {
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        documento: v.documento.trim(),
        email: v.email?.trim() || null,
        telefono: v.telefono?.trim() || null,
        direccion: v.direccion?.trim() || null,
        estado: v.estado ? 'ACTIVO' : 'INACTIVO',
      },
      ruc: v.ruc?.trim() || null,
      tipoCliente: v.tipoCliente || null,
      limiteCredito: isUpdate ? (c.limiteCredito ?? 0) : 0,
      fechaRegistro: isUpdate ? (c.fechaRegistro ?? null) : this.today(),
      observaciones: v.observaciones?.trim() || null,
      estado: v.estado,
    };

    this.saving = true;
    const request = (c && c.id_cliente) 
      ? this.clienteService.update(c.id_cliente, payload)
      : this.clienteService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el cliente';
      },
    });
  }

  private today(): string {
    const d = new Date();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
