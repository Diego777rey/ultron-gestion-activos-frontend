import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';

/**
 * Diálogo de formulario para registrar o editar un cliente.
 * Reutiliza el modal, los botones y la directiva de autofoco genéricos.
 */
@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, ModalComponent, UiButtonComponent, AutofocusDirective],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Controla la visibilidad del diálogo. */
  readonly open = input<boolean>(false);
  /** Cliente a editar; `null` para alta nueva. */
  readonly cliente = input<ClienteOutput | null>(null);
  /** Indica que se está guardando (deshabilita acciones). */
  readonly saving = input<boolean>(false);

  /** Emite el payload listo para enviar al backend. */
  readonly save = output<ClienteInput>();
  /** Emite al cerrar/cancelar. */
  readonly closed = output<void>();

  protected readonly isEdit = computed(() => !!this.cliente()?.id_cliente);

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
    limiteCredito: [0],
    fechaRegistro: [''],
    observaciones: [''],
    estado: [true],
  });

  constructor() {
    effect(() => {
      // Repuebla el formulario cada vez que cambia el cliente o se abre el diálogo.
      if (!this.open()) {
        return;
      }
      const c = this.cliente();
      if (c) {
        this.form.reset({
          nombre: c.persona?.nombre ?? '',
          apellido: c.persona?.apellido ?? '',
          documento: c.persona?.documento ?? '',
          email: c.persona?.email ?? '',
          telefono: c.persona?.telefono ?? '',
          direccion: c.persona?.direccion ?? '',
          ruc: c.ruc ?? '',
          tipoCliente: c.tipoCliente ?? 'Persona Física',
          limiteCredito: c.limiteCredito ?? 0,
          fechaRegistro: c.fechaRegistro ?? '',
          observaciones: c.observaciones ?? '',
          estado: c.estado ?? true,
        });
      } else {
        this.form.reset({
          nombre: '',
          apellido: '',
          documento: '',
          email: '',
          telefono: '',
          direccion: '',
          ruc: '',
          tipoCliente: 'Persona Física',
          limiteCredito: 0,
          fechaRegistro: this.today(),
          observaciones: '',
          estado: true,
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
      limiteCredito: Number(v.limiteCredito) || 0,
      fechaRegistro: v.fechaRegistro || null,
      observaciones: v.observaciones?.trim() || null,
      estado: v.estado,
    };
    this.save.emit(payload);
  }

  protected onClose(): void {
    this.closed.emit();
  }

  private today(): string {
    const d = new Date();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
