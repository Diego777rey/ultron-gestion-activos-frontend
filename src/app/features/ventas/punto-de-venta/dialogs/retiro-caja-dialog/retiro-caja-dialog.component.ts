import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { UsuarioService } from '../../../../personas/usuarios/services/usuario.service';
import { UsuarioOutput } from '../../../../personas/usuarios/interfaces/usuario.interface';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { ArqueoMoneda, RetiroCajaOutput } from '../../interfaces/sesion-caja.interface';
import { RetiroCajaService } from '../../services/retiro-caja.service';
import { SesionCajaService } from '../../services/sesion-caja.service';
import { esGuarani, formatoMoneda, simboloMoneda } from '../../models/monedas';

const MAX_OBSERVACION = 500;

interface MonedaRetiro {
  codigo: string;
  label: string;
}

const MONEDAS: MonedaRetiro[] = [
  { codigo: 'PYG', label: 'Guaraní' },
  { codigo: 'BRL', label: 'Real' },
  { codigo: 'USD', label: 'Dólar' },
];

/** Retiro de efectivo con la caja abierta. El disponible y la validación del monto vienen del backend. */
@Component({
  selector: 'app-retiro-caja-dialog',
  imports: [
    ModalComponent,
    UiButtonComponent,
    EntitySearcherComponent,
    NotifyErrorComponent,
    ReactiveFormsModule,
    DecimalPipe,
  ],
  template: `
    <app-modal
      [open]="true"
      title="Retiro de caja"
      [subtitle]="'Sesión #' + idSesionCaja()"
      maxWidth="640px"
      headerVariant="primary"
      [closeOnBackdrop]="false"
      (closed)="cerrar.emit()"
    >
      <form class="retiro" [formGroup]="form" (ngSubmit)="registrar()">
        <app-notify-error [message]="error()" />

        <div class="bloque">
          <span id="retiro-moneda" class="retiro__label">Moneda</span>
          <div class="fila" role="radiogroup" aria-labelledby="retiro-moneda">
            @for (moneda of monedas; track moneda.codigo) {
              <button
                type="button"
                class="opcion"
                role="radio"
                [class.opcion--selected]="monedaSeleccionada() === moneda.codigo"
                [attr.aria-checked]="monedaSeleccionada() === moneda.codigo"
                (click)="seleccionarMoneda(moneda.codigo)"
              >
                <strong>{{ moneda.label }}</strong>
                <small>
                  @if (cargandoArqueo()) {
                    Calculando…
                  } @else {
                    Disponible {{ simbolo(moneda.codigo) }}
                    {{ disponible(moneda.codigo) | number: formato(moneda.codigo) }}
                  }
                </small>
              </button>
            }
          </div>
        </div>

        <div class="bloque">
          <label class="retiro__label" for="retiro-monto">Monto a retirar</label>
          <div class="campo" [class.campo--error]="mostrarError('monto')">
            <span class="campo__prefijo" aria-hidden="true">{{ simbolo(monedaSeleccionada()) }}</span>
            <input
              id="retiro-monto"
              class="campo__input campo__input--monto"
              type="number"
              min="0"
              [attr.step]="esGuarani(monedaSeleccionada()) ? 1 : 0.01"
              [attr.inputmode]="esGuarani(monedaSeleccionada()) ? 'numeric' : 'decimal'"
              autocomplete="off"
              formControlName="monto"
              [attr.aria-invalid]="mostrarError('monto')"
              [attr.aria-describedby]="mostrarError('monto') ? 'retiro-monto-error' : null"
            />
          </div>
          @if (mostrarError('monto')) {
            <small id="retiro-monto-error" class="retiro__error">Ingresá un monto mayor a cero</small>
          }
        </div>

        <div class="bloque">
          <span class="retiro__label">Usuario responsable del retiro</span>
          <app-entity-searcher
            [items]="usuariosParaBuscador()"
            [value]="form.controls.idUsuarioResponsable.value"
            [columns]="usuarioColumns"
            [displayFn]="usuarioLabelFn"
            [keyFn]="usuarioKeyFn"
            [backendPagination]="true"
            [totalItems]="usuariosTotal()"
            [pageIndex]="usuariosPage()"
            [pageSize]="usuariosPageSize()"
            [loading]="cargandoUsuarios()"
            [error]="mostrarError('idUsuarioResponsable')"
            errorText="Seleccioná quién retira el dinero"
            (searchChange)="onUsuarioSearch($event)"
            (pageChange)="onUsuarioPage($event)"
            (itemChange)="onUsuarioSelected($event)"
            label="Buscar usuario..."
            searchPlaceholder="Buscar por usuario o nombre..."
          />
        </div>

        <div class="bloque">
          <div class="bloque__titulo">
            <label class="retiro__label" for="retiro-observacion">Observación</label>
            <small>{{ form.controls.observacion.value.length }}/{{ maxObservacion }}</small>
          </div>
          <div class="campo" [class.campo--error]="mostrarError('observacion')">
            <textarea
              id="retiro-observacion"
              class="campo__input campo__input--texto"
              rows="3"
              [attr.maxlength]="maxObservacion"
              placeholder="Motivo del retiro (depósito, pago a proveedor...)"
              formControlName="observacion"
              [attr.aria-invalid]="mostrarError('observacion')"
              [attr.aria-describedby]="mostrarError('observacion') ? 'retiro-observacion-error' : null"
            ></textarea>
          </div>
          @if (mostrarError('observacion')) {
            <small id="retiro-observacion-error" class="retiro__error">Escribí el motivo del retiro</small>
          }
        </div>

        <footer class="retiro__footer">
          <app-ui-button label="Cancelar" icon="close" variant="ghost" (clicked)="cerrar.emit()" />
          <app-ui-button
            label="Registrar retiro"
            icon="outbox"
            variant="primary"
            type="submit"
            [loading]="guardando()"
          />
        </footer>
      </form>
    </app-modal>
  `,
  styles: `
    .retiro {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem 1.5rem 1.5rem;
    }

    .bloque {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bloque__titulo {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .bloque__titulo small {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .retiro__label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .retiro__error {
      font-size: 0.75rem;
      color: var(--danger-color);
    }

    .fila {
      display: flex;
      gap: 0.5rem;
    }

    .opcion {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.125rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font: inherit;
      cursor: pointer;
    }

    .opcion strong {
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .opcion small {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .opcion:hover {
      border-color: var(--border-strong-hover);
      background: var(--surface-raised-hover);
    }

    .opcion--selected,
    .opcion--selected:hover {
      border-color: var(--primary-color);
      background: var(--active-bg);
    }

    .opcion:focus-visible,
    .campo:focus-within {
      outline: none;
      border-color: var(--primary-color);
    }

    .campo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1rem;
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
    }

    .campo--error,
    .campo--error:focus-within {
      border-color: var(--danger-color);
    }

    .campo__prefijo {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .campo__input {
      flex: 1;
      min-width: 0;
      padding: 0.625rem 0;
      background: transparent;
      border: none;
      outline: none;
      font: inherit;
      color: var(--text-primary);
    }

    .campo__input--monto {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .campo__input--texto {
      resize: vertical;
      min-height: 4.5rem;
    }

    .campo__input::placeholder {
      color: var(--text-muted);
    }

    .retiro__footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetiroCajaDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly retiroCajaService = inject(RetiroCajaService);
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly usuarioService = inject(UsuarioService);

  readonly idSesionCaja = input.required<number>();
  readonly cerrar = output<void>();
  readonly registrado = output<RetiroCajaOutput>();

  protected readonly monedas = MONEDAS;
  protected readonly maxObservacion = MAX_OBSERVACION;
  protected readonly esGuarani = esGuarani;

  protected readonly form = this.fb.group({
    moneda: this.fb.nonNullable.control('PYG'),
    monto: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    idUsuarioResponsable: this.fb.control<string | null>(null, Validators.required),
    observacion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(MAX_OBSERVACION),
    ]),
  });

  protected readonly monedaSeleccionada = toSignal(this.form.controls.moneda.valueChanges, {
    initialValue: this.form.controls.moneda.value,
  });

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly enviado = signal(false);

  private readonly arqueo = signal<ArqueoMoneda[]>([]);
  protected readonly cargandoArqueo = signal(true);

  private readonly usuarios = signal<UsuarioOutput[]>([]);
  private readonly selectedUsuario = signal<UsuarioOutput | null>(null);
  protected readonly usuariosTotal = signal(0);
  protected readonly usuariosPage = signal(0);
  protected readonly usuariosPageSize = signal(10);
  private readonly usuariosFilter = signal('');
  protected readonly cargandoUsuarios = signal(false);

  protected readonly usuarioColumns: TableColumn<UsuarioOutput>[] = [
    { key: 'username', header: 'Usuario', value: (u) => u.username ?? '' },
    { key: 'nombre', header: 'Nombre completo', value: (u) => nombreCompletoPersona(u.funcionario?.persona) },
  ];
  protected readonly usuarioLabelFn = (u: UsuarioOutput) => {
    const nombre = nombreCompletoPersona(u.funcionario?.persona);
    return [u.username, nombre].filter(Boolean).join(' — ');
  };
  protected readonly usuarioKeyFn = (u: UsuarioOutput) => u.id;

  protected readonly usuariosParaBuscador = computed(() => {
    const list = this.usuarios();
    const selected = this.selectedUsuario();
    if (selected && !list.some((u) => u.id === selected.id)) {
      return [selected, ...list];
    }
    return list;
  });

  ngOnInit(): void {
    this.sesionCajaService.arqueo(this.idSesionCaja()).subscribe({
      next: (arqueo) => {
        this.arqueo.set(arqueo);
        this.cargandoArqueo.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo consultar el efectivo disponible');
        this.cargandoArqueo.set(false);
      },
    });
    this.fetchUsuarios(0, this.usuariosPageSize(), '');
  }

  protected disponible(moneda: string): number {
    return Math.max(0, Number(this.arqueo().find((a) => a.moneda === moneda)?.esperado ?? 0));
  }

  protected simbolo(moneda: string): string {
    return simboloMoneda(moneda);
  }

  protected formato(moneda: string): string {
    return formatoMoneda(moneda);
  }

  protected seleccionarMoneda(codigo: string): void {
    this.form.controls.moneda.setValue(codigo);
  }

  protected mostrarError(control: 'monto' | 'idUsuarioResponsable' | 'observacion'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || this.enviado());
  }

  protected onUsuarioSearch(filter: string): void {
    this.fetchUsuarios(0, this.usuariosPageSize(), filter);
  }

  protected onUsuarioPage(event: PageChange): void {
    this.fetchUsuarios(event.pageIndex, event.pageSize, this.usuariosFilter());
  }

  protected onUsuarioSelected(usuario: UsuarioOutput | null): void {
    this.selectedUsuario.set(usuario);
    this.form.controls.idUsuarioResponsable.setValue(usuario?.id ?? null);
    this.form.controls.idUsuarioResponsable.markAsTouched();
  }

  protected registrar(): void {
    this.enviado.set(true);
    this.error.set(null);
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.retiroCajaService
      .registrar({
        idSesionCaja: this.idSesionCaja(),
        moneda: v.moneda,
        monto: v.monto!,
        observacion: v.observacion.trim(),
        idUsuarioResponsable: Number(v.idUsuarioResponsable),
      })
      .subscribe({
        next: (retiro) => {
          this.guardando.set(false);
          this.registrado.emit(retiro);
        },
        error: (err: Error) => {
          this.guardando.set(false);
          this.error.set(err.message || 'No se pudo registrar el retiro');
        },
      });
  }

  private fetchUsuarios(page: number, size: number, filter: string): void {
    this.cargandoUsuarios.set(true);
    this.usuarioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.usuarios.set(res.content ?? []);
        this.usuariosTotal.set(res.pageInfo.totalElements);
        this.usuariosPage.set(page);
        this.usuariosPageSize.set(size);
        this.usuariosFilter.set(filter);
        this.cargandoUsuarios.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de usuarios');
        this.cargandoUsuarios.set(false);
      },
    });
  }
}
