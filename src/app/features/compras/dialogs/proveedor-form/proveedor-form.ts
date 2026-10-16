import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { NotifyErrorComponent } from '../../../../shared/components/notify-error/notify-error';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../shared/directives/uppercase.directive';
import { ProveedorOutput, ProveedorInput, TipoPersona } from '../../../../shared/models/compras.model';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { PersonaService } from '../../../personas/shared/services/persona.service';
import { PersonaOutput } from '../../../personas/funcionarios/interfaces/funcionario.interface';
import { nombreCompletoPersona } from '../../../personas/shared/nombre-persona';
import {
  ConsultaRucService,
  ContribuyenteRuc,
  esRucConsultable,
  normalizarRuc,
} from '../../../personas/shared/services/consulta-ruc.service';

/** Resultado de buscar el RUC: proveedor, persona del sistema, DNIT o alta manual. */
type Busqueda =
  | { tipo: 'proveedor'; proveedor: ProveedorOutput }
  | { tipo: 'persona'; persona: PersonaOutput }
  | { tipo: 'buscando-dnit' }
  | { tipo: 'dnit'; contribuyente: ContribuyenteRuc }
  | { tipo: 'manual' }
  | { tipo: 'error-dnit'; mensaje: string };

@Component({
  selector: 'app-proveedor-form',
  imports: [NotifyErrorComponent, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './proveedor-form.html',
  styleUrl: '../../../../shared/styles/entity-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proveedorService = inject(ProveedorService);
  private readonly personaService = inject(PersonaService);
  private readonly consultaRucService = inject(ConsultaRucService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly proveedor = input<ProveedorOutput | null>(null);
  readonly saved = output<void>();

  protected readonly tipoPersona = TipoPersona;
  protected readonly tipoActual = signal<TipoPersona>(TipoPersona.JURIDICA);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal<Busqueda | null>(null);
  /** Proveedor que se va a actualizar: el de la lista o el encontrado por RUC. */
  private readonly proveedorActual = signal<ProveedorOutput | null>(null);
  private readonly documento = signal('');
  protected readonly isEdit = computed(() => !!this.proveedorActual()?.id_proveedor);

  protected readonly contribuyente = computed(() => {
    const resultado = this.busqueda();
    return resultado?.tipo === 'dnit' ? resultado.contribuyente : null;
  });
  protected readonly errorDnit = computed(() => {
    const resultado = this.busqueda();
    return resultado?.tipo === 'error-dnit' ? resultado.mensaje : null;
  });

  protected readonly form = this.fb.nonNullable.group({
    tipoPersona: [TipoPersona.JURIDICA, Validators.required],
    nombre: ['', [Validators.maxLength(255)]],
    razonSocial: ['', [Validators.required, Validators.maxLength(255)]],
    nombreComercial: ['', [Validators.maxLength(255)]],
    ruc: ['', [Validators.required, Validators.maxLength(50)]],
    telefono: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    ciudad: ['', [Validators.maxLength(255)]],
    direccion: ['', [Validators.maxLength(500)]],
    activo: [true],
  });

  /** Para no pisar un nombre que el usuario corrigió a mano. */
  private autocompletado = { nombre: '', razonSocial: '' };

  constructor() {
    this.form.controls.tipoPersona.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.tipoActual.set(tipo);
      this.aplicarValidadores(tipo);
    });

    this.form.controls.ruc.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(500),
        map((ruc) => ruc.trim()),
        distinctUntilChanged(),
        switchMap((ruc) => this.buscar(ruc)),
      )
      .subscribe((resultado) => this.aplicarBusqueda(resultado));

    effect(() => {
      const proveedor = this.proveedor();
      this.busqueda.set(null);
      this.error.set(null);
      this.limpiarAutocompletado();
      this.proveedorActual.set(proveedor);
      if (proveedor?.id_proveedor) {
        this.cargarProveedor(proveedor);
      } else {
        this.form.reset(this.valoresVacios(), { emitEvent: false });
        this.tipoActual.set(TipoPersona.JURIDICA);
        this.aplicarValidadores(TipoPersona.JURIDICA);
      }
    });
  }

  /**
   * 1. Proveedor ya registrado → se cargan sus datos.
   * 2. Persona del sistema (funcionario, cliente) → se cargan sus datos.
   * 3. Contribuyente en la DNIT → razón social o nombre y RUC.
   * 4. Nada → se completa a mano y se registra uno nuevo.
   */
  private buscar(ruc: string): Observable<Busqueda | null> {
    if (!ruc || this.proveedor()) {
      return of(null);
    }
    return this.proveedorService.buscarPorRuc(ruc).pipe(
      catchError(() => of(null)),
      switchMap((existente): Observable<Busqueda | null> => {
        if (existente) {
          return of({ tipo: 'proveedor', proveedor: existente });
        }
        return this.buscarPersona(ruc);
      }),
    );
  }

  private buscarPersona(ruc: string): Observable<Busqueda | null> {
    const documento = normalizarRuc(ruc).replace(/-\d$/, '');
    return this.personaService.buscarPorDocumento(documento || ruc).pipe(
      map((data) => data.buscarPersonaPorDocumento),
      catchError(() => of(null)),
      switchMap((persona): Observable<Busqueda | null> => {
        if (persona?.nombre) {
          return of({ tipo: 'persona', persona });
        }
        return esRucConsultable(ruc) ? this.consultarDnit(ruc) : of({ tipo: 'manual' });
      }),
    );
  }

  private consultarDnit(ruc: string): Observable<Busqueda> {
    return this.consultaRucService.consultar(ruc).pipe(
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
    if (this.proveedor()) {
      return;
    }
    if (this.proveedorActual() && resultado?.tipo !== 'proveedor') {
      this.descartarProveedorEncontrado();
    }
    this.busqueda.set(resultado);

    switch (resultado?.tipo) {
      case 'proveedor':
        this.proveedorActual.set(resultado.proveedor);
        this.cargarProveedor(resultado.proveedor);
        break;
      case 'persona':
        this.aplicarPersona(resultado.persona);
        break;
      case 'dnit':
        this.aplicarContribuyente(resultado.contribuyente);
        break;
    }
  }

  private aplicarPersona(persona: PersonaOutput): void {
    this.tipoActual.set(TipoPersona.FISICA);
    this.aplicarValidadores(TipoPersona.FISICA);
    this.form.controls.tipoPersona.setValue(TipoPersona.FISICA, { emitEvent: false });
    this.documento.set(persona.documento?.trim() || normalizarRuc(this.form.controls.ruc.value).replace(/-\d$/, ''));
    this.asignarAutocompletado('nombre', nombreCompletoPersona(persona));
    this.asignarContacto('telefono', persona.telefono);
    this.asignarContacto('email', persona.email);
    this.asignarContacto('direccion', persona.direccion);
  }

  private asignarContacto(clave: 'telefono' | 'email' | 'direccion', valor: string | null | undefined): void {
    const texto = valor?.trim() ?? '';
    if (!texto || this.form.controls[clave].value.trim()) {
      return;
    }
    this.form.controls[clave].setValue(texto, { emitEvent: false });
  }

  private aplicarContribuyente(contribuyente: ContribuyenteRuc): void {
    const tipo = contribuyente.personaJuridica || contribuyente.entidadPublica
      ? TipoPersona.JURIDICA
      : TipoPersona.FISICA;
    this.tipoActual.set(tipo);
    this.aplicarValidadores(tipo);
    this.form.controls.tipoPersona.setValue(tipo, { emitEvent: false });
    this.form.controls.ruc.setValue(contribuyente.ruc, { emitEvent: false });
    this.documento.set(contribuyente.documento ?? '');

    if (tipo === TipoPersona.JURIDICA) {
      this.asignarAutocompletado('razonSocial', contribuyente.razonSocial || contribuyente.nombre);
      return;
    }

    this.asignarAutocompletado('nombre', contribuyente.nombre || contribuyente.razonSocial);
  }

  /** Se cambió el RUC después de cargar un proveedor existente: vuelve a ser un alta. */
  private descartarProveedorEncontrado(): void {
    this.proveedorActual.set(null);
    this.documento.set('');
    this.limpiarAutocompletado();
    const ruc = this.form.controls.ruc.value;
    this.form.reset(this.valoresVacios(ruc), { emitEvent: false });
    this.tipoActual.set(TipoPersona.JURIDICA);
    this.aplicarValidadores(TipoPersona.JURIDICA);
  }

  private asignarAutocompletado(clave: 'nombre' | 'razonSocial', valor: string): void {
    const control = this.form.controls[clave];
    const actual = control.value.trim();
    if (actual && actual !== this.autocompletado[clave]) {
      return;
    }
    const texto = valor.trim().toUpperCase();
    control.setValue(texto, { emitEvent: false });
    this.autocompletado[clave] = texto;
  }

  private limpiarAutocompletado(): void {
    this.autocompletado = { nombre: '', razonSocial: '' };
  }

  private cargarProveedor(proveedor: ProveedorOutput): void {
    const tipo = proveedor.tipo_persona ?? TipoPersona.JURIDICA;
    this.tipoActual.set(tipo);
    this.aplicarValidadores(tipo);
    this.documento.set(proveedor.documento ?? '');
    this.form.reset(
      {
        tipoPersona: tipo,
        nombre: nombreCompletoPersona(proveedor),
        razonSocial: proveedor.razon_social ?? '',
        nombreComercial: proveedor.nombre_comercial ?? '',
        ruc: proveedor.ruc ?? '',
        telefono: proveedor.telefono ?? '',
        email: proveedor.email ?? '',
        ciudad: proveedor.ciudad ?? '',
        direccion: proveedor.direccion ?? '',
        activo: proveedor.activo ?? true,
      },
      { emitEvent: false },
    );
  }

  private valoresVacios(ruc = '') {
    this.documento.set('');
    return {
      tipoPersona: TipoPersona.JURIDICA,
      nombre: '',
      razonSocial: '',
      nombreComercial: '',
      ruc,
      telefono: '',
      email: '',
      ciudad: '',
      direccion: '',
      activo: true,
    };
  }

  protected onSubmit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const fisica = valor.tipoPersona === TipoPersona.FISICA;
    const payload: ProveedorInput = {
      tipoPersona: valor.tipoPersona,
      nombre: fisica ? valor.nombre.trim() : '',
      apellido: '',
      razonSocial: fisica ? '' : valor.razonSocial.trim(),
      nombreComercial: fisica ? '' : valor.nombreComercial.trim(),
      ruc: valor.ruc.trim(),
      documento: this.documento().trim(),
      telefono: valor.telefono.trim(),
      email: valor.email.trim(),
      ciudad: valor.ciudad.trim(),
      direccion: valor.direccion.trim(),
      activo: valor.activo,
    };

    const proveedor = this.proveedorActual();
    this.saving.set(true);
    const request = proveedor?.id_proveedor
      ? this.proveedorService.update(proveedor.id_proveedor, payload)
      : this.proveedorService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el proveedor');
      },
    });
  }

  private aplicarValidadores(tipo: TipoPersona): void {
    const fisica = tipo === TipoPersona.FISICA;
    const nombre = fisica ? [Validators.required, Validators.maxLength(255)] : [Validators.maxLength(255)];
    const razon = fisica ? [Validators.maxLength(255)] : [Validators.required, Validators.maxLength(255)];
    this.form.controls.nombre.setValidators(nombre);
    this.form.controls.razonSocial.setValidators(razon);
    this.form.controls.nombre.updateValueAndValidity({ emitEvent: false });
    this.form.controls.razonSocial.updateValueAndValidity({ emitEvent: false });
  }
}
