import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, startWith } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ClienteService } from '../../services/cliente.service';
import { PersonaService } from '../../../shared/services/persona.service';
import {
  ConsultaRucService,
  ContribuyenteRuc,
  esRucConsultable,
} from '../../../shared/services/consulta-ruc.service';
import { nombreCompletoPersona } from '../../../shared/nombre-persona';
import { PersonaOutput } from '../../../funcionarios/interfaces/funcionario.interface';

type ConsultaRuc =
  | { tipo: 'buscando' }
  | { tipo: 'encontrado'; contribuyente: ContribuyenteRuc }
  | { tipo: 'no-encontrado' }
  | { tipo: 'error'; mensaje: string };

type ResultadoDocumento =
  | { tipo: 'local'; persona: PersonaOutput }
  | { tipo: 'ruc'; consulta: ConsultaRuc }
  | { tipo: 'nada' };

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
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
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
  private readonly consultaRucService = inject(ConsultaRucService);

  protected readonly consultaRuc = signal<ConsultaRuc | null>(null);
  protected readonly contribuyente = computed(() => {
    const consulta = this.consultaRuc();
    return consulta?.tipo === 'encontrado' ? consulta.contribuyente : null;
  });
  protected readonly errorRuc = computed(() => {
    const consulta = this.consultaRuc();
    return consulta?.tipo === 'error' ? consulta.mensaje : null;
  });
  /** Para no pisar un nombre que el usuario corrigió a mano. */
  private nombreAutocompletado = '';

  constructor() {
    effect(() => {
      const c = this.cliente();
      this.consultaRuc.set(null);
      this.nombreAutocompletado = '';
      if (c) {
        this.isEdit = !!c.id_cliente;
        this.form.reset({
          nombre: nombreCompletoPersona(c.persona),
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
      map((doc) => doc.trim()),
      distinctUntilChanged(),
      switchMap((doc) => this.buscarDocumento(doc)),
    ).subscribe((resultado) => {
      if (resultado.tipo === 'local') {
        this.consultaRuc.set(null);
        this.form.patchValue({
          nombre: nombreCompletoPersona(resultado.persona),
          email: resultado.persona.email || '',
          telefono: resultado.persona.telefono || '',
          direccion: resultado.persona.direccion || '',
        });
        return;
      }
      if (resultado.tipo === 'nada') {
        this.consultaRuc.set(null);
        return;
      }
      this.consultaRuc.set(resultado.consulta);
      if (resultado.consulta.tipo === 'encontrado') {
        this.aplicarContribuyente(resultado.consulta.contribuyente);
      }
    });
  }

  /** Primero la base propia (trae teléfono y email); si no está, la DNIT. */
  private buscarDocumento(doc: string): Observable<ResultadoDocumento> {
    if (!doc || this.isEdit) {
      return of({ tipo: 'nada' });
    }
    return this.personaService.buscarPorDocumento(doc).pipe(
      map((data) => data.buscarPersonaPorDocumento),
      catchError(() => of(null)),
      switchMap((persona): Observable<ResultadoDocumento> => {
        if (persona) {
          return of({ tipo: 'local', persona });
        }
        if (!esRucConsultable(doc)) {
          return of({ tipo: 'nada' });
        }
        return this.consultaRucService.consultar(doc).pipe(
          map((contribuyente): ConsultaRuc =>
            contribuyente ? { tipo: 'encontrado', contribuyente } : { tipo: 'no-encontrado' },
          ),
          catchError((err: Error) =>
            of<ConsultaRuc>({ tipo: 'error', mensaje: err.message || 'No se pudo consultar el RUC' }),
          ),
          startWith<ConsultaRuc>({ tipo: 'buscando' }),
          map((consulta): ResultadoDocumento => ({ tipo: 'ruc', consulta })),
        );
      }),
    );
  }

  private aplicarContribuyente(c: ContribuyenteRuc): void {
    const nombreActual = this.form.controls.nombre.value.trim();
    const nombre = c.nombre.trim().toUpperCase();
    if (!nombreActual || nombreActual === this.nombreAutocompletado) {
      this.form.controls.nombre.setValue(nombre);
      this.nombreAutocompletado = nombre;
    }
    this.form.patchValue({
      ruc: c.ruc,
      tipoCliente: c.entidadPublica ? 'Gobierno' : c.personaJuridica ? 'Empresa' : 'Persona Física',
    });
  }

  private readonly dialogRef = inject(DialogRef, { optional: true });

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
        apellido: '',
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
        this.dialogRef?.close(true);
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
