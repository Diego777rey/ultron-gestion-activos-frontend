import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';
import { ClienteService } from '../../services/cliente.service';
import { PersonaService } from '../../../shared/services/persona.service';
import {
  ConsultaRucService,
  ContribuyenteRuc,
  esRucConsultable,
} from '../../../shared/services/consulta-ruc.service';
import { nombreCompletoPersona } from '../../../shared/nombre-persona';
import { PersonaOutput } from '../../../funcionarios/interfaces/funcionario.interface';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';

/** Resultado de buscar el CI/RUC: base propia, DNIT o carga manual. */
type Busqueda =
  | { tipo: 'cliente'; cliente: ClienteOutput }
  | { tipo: 'persona'; persona: PersonaOutput }
  | { tipo: 'buscando-dnit' }
  | { tipo: 'dnit'; contribuyente: ContribuyenteRuc }
  | { tipo: 'manual' }
  | { tipo: 'error-dnit'; mensaje: string };

const TIPO_CLIENTE_DEFAULT = 'Persona Física';

@Component({
  selector: 'app-cliente-form',
  imports: [NotifyErrorComponent, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly personaService = inject(PersonaService);
  private readonly consultaRucService = inject(ConsultaRucService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  /** Cliente a editar (desde la lista de clientes). */
  readonly cliente = input<ClienteOutput | null>(null);
  /** CI/RUC con el que arranca un alta (ej. lo tipeado en el buscador de la factura). */
  readonly documentoInicial = input<string | null>(null);

  readonly saved = output<ClienteOutput>();
  /** El CI/RUC tipeado ya corresponde a un cliente registrado. */
  readonly existente = output<ClienteOutput>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal<Busqueda | null>(null);
  /** Cliente que se va a actualizar: el recibido para editar o el encontrado por documento. */
  private readonly clienteActual = signal<ClienteOutput | null>(null);
  protected readonly isEdit = computed(() => !!this.clienteActual()?.id_cliente);

  protected readonly contribuyente = computed(() => {
    const b = this.busqueda();
    return b?.tipo === 'dnit' ? b.contribuyente : null;
  });
  protected readonly errorDnit = computed(() => {
    const b = this.busqueda();
    return b?.tipo === 'error-dnit' ? b.mensaje : null;
  });

  protected readonly tiposCliente = ['Persona Física', 'Empresa', 'Gobierno'];

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    documento: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', [Validators.email]],
    telefono: [''],
    direccion: [''],
    ruc: [''],
    tipoCliente: [TIPO_CLIENTE_DEFAULT],
    observaciones: [''],
    estado: [true],
  });

  /** Para no pisar un nombre que el usuario corrigió a mano. */
  private nombreAutocompletado = '';

  constructor() {
    this.form.controls.documento.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(500),
        map((doc) => doc.trim()),
        distinctUntilChanged(),
        switchMap((doc) => this.buscar(doc)),
      )
      .subscribe((resultado) => this.aplicarBusqueda(resultado));

    effect(() => {
      const c = this.cliente();
      const documentoInicial = this.documentoInicial();
      this.busqueda.set(null);
      this.error.set(null);
      this.nombreAutocompletado = '';
      this.clienteActual.set(c);
      if (c) {
        this.cargarCliente(c);
      } else {
        this.form.reset(this.valoresVacios(documentoInicial?.trim() ?? ''));
      }
    });
  }

  /**
   * 1. Cliente ya registrado → se cargan sus datos.
   * 2. Persona del sistema (ej. funcionario) → se cargan sus datos.
   * 3. Contribuyente en la DNIT → nombre/razón social y RUC.
   * 4. Nada → consumidor final, se carga el nombre a mano.
   */
  private buscar(doc: string): Observable<Busqueda | null> {
    if (!doc || this.cliente()) {
      return of(null);
    }
    return this.clienteService.buscarPorDocumento(doc).pipe(
      catchError(() => of(null)),
      switchMap((cliente): Observable<Busqueda | null> => {
        if (cliente) {
          return of({ tipo: 'cliente', cliente });
        }
        return this.personaService.buscarPorDocumento(doc).pipe(
          map((data) => data.buscarPersonaPorDocumento),
          catchError(() => of(null)),
          switchMap((persona): Observable<Busqueda | null> => {
            if (persona) {
              return of({ tipo: 'persona', persona });
            }
            return esRucConsultable(doc) ? this.consultarDnit(doc) : of({ tipo: 'manual' });
          }),
        );
      }),
    );
  }

  private consultarDnit(doc: string): Observable<Busqueda> {
    return this.consultaRucService.consultar(doc).pipe(
      map((contribuyente): Busqueda =>
        contribuyente ? { tipo: 'dnit', contribuyente } : { tipo: 'manual' },
      ),
      catchError((err: Error) =>
        of<Busqueda>({ tipo: 'error-dnit', mensaje: err.message || 'No se pudo consultar el RUC' }),
      ),
      startWith<Busqueda>({ tipo: 'buscando-dnit' }),
    );
  }

  private aplicarBusqueda(resultado: Busqueda | null): void {
    if (this.cliente()) {
      return;
    }
    if (this.clienteActual() && resultado?.tipo !== 'cliente') {
      this.descartarClienteEncontrado();
    }
    this.busqueda.set(resultado);

    switch (resultado?.tipo) {
      case 'cliente':
        this.clienteActual.set(resultado.cliente);
        this.cargarCliente(resultado.cliente);
        this.existente.emit(resultado.cliente);
        break;
      case 'persona':
        this.setNombreAutocompletado(nombreCompletoPersona(resultado.persona));
        this.form.patchValue({
          email: resultado.persona.email || '',
          telefono: resultado.persona.telefono || '',
          direccion: resultado.persona.direccion || '',
        });
        break;
      case 'dnit': {
        const c = resultado.contribuyente;
        this.setNombreAutocompletado(c.nombre);
        this.form.patchValue({
          ruc: c.ruc,
          tipoCliente: c.entidadPublica ? 'Gobierno' : c.personaJuridica ? 'Empresa' : TIPO_CLIENTE_DEFAULT,
        });
        break;
      }
    }
  }

  /** Se cambió el documento después de cargar un cliente existente: vuelve a ser un alta. */
  private descartarClienteEncontrado(): void {
    this.clienteActual.set(null);
    this.nombreAutocompletado = '';
    const documento = this.form.controls.documento.value;
    this.form.reset(this.valoresVacios(documento), { emitEvent: false });
  }

  private setNombreAutocompletado(nombre: string): void {
    const actual = this.form.controls.nombre.value.trim();
    if (actual && actual !== this.nombreAutocompletado) {
      return;
    }
    const valor = nombre.trim().toUpperCase();
    this.form.controls.nombre.setValue(valor);
    this.nombreAutocompletado = valor;
  }

  private cargarCliente(c: ClienteOutput): void {
    this.form.reset(
      {
        nombre: nombreCompletoPersona(c.persona),
        documento: c.persona?.documento ?? '',
        email: c.persona?.email ?? '',
        telefono: c.persona?.telefono ?? '',
        direccion: c.persona?.direccion ?? '',
        ruc: c.ruc ?? '',
        tipoCliente: c.tipoCliente ?? TIPO_CLIENTE_DEFAULT,
        observaciones: c.observaciones ?? '',
        estado: c.estado ?? true,
      },
      { emitEvent: false },
    );
  }

  private valoresVacios(documento: string) {
    return {
      nombre: '',
      documento,
      email: '',
      telefono: '',
      direccion: '',
      ruc: '',
      tipoCliente: TIPO_CLIENTE_DEFAULT,
      observaciones: '',
      estado: true,
    };
  }

  protected onSubmit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const c = this.clienteActual();
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
      limiteCredito: c?.id_cliente ? (c.limiteCredito ?? 0) : 0,
      fechaRegistro: c?.id_cliente ? (c.fechaRegistro ?? null) : this.today(),
      observaciones: v.observaciones?.trim() || null,
      estado: v.estado,
    };

    this.saving.set(true);
    this.error.set(null);
    const request = c?.id_cliente
      ? this.clienteService.update(c.id_cliente, payload)
      : this.clienteService.create(payload);

    request.subscribe({
      next: (guardado) => {
        this.saving.set(false);
        this.saved.emit(guardado);
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el cliente');
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
