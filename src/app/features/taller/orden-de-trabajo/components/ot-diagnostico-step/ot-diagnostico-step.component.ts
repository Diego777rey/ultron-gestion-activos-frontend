import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OrdenTrabajoInput, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';

@Component({
  selector: 'app-ot-diagnostico-step',
  imports: [ReactiveFormsModule, OtDetalleLineasComponent],
  template: `
    <p class="ot-hint">
      Define tiempos estimados, arma el presupuesto y valida la aprobación del cliente.
    </p>

    <section class="ot-section ot-section--narrow">
      <h3 class="ot-section-title">Tiempos y aprobación</h3>
      <form class="ot-form" [formGroup]="form">
        <div class="ot-form__grid--2">
          <div class="ot-field">
            <label class="ot-field__label-static" for="ot-f-inicio">Fecha de inicio estimada</label>
            <input id="ot-f-inicio" type="date" class="ot-field__input" formControlName="fecha_inicio_estimada" />
          </div>
          <div class="ot-field">
            <label class="ot-field__label-static" for="ot-f-fin">Fecha de fin estimada</label>
            <input id="ot-f-fin" type="date" class="ot-field__input" formControlName="fecha_fin_estimada" />
          </div>
        </div>
        <div class="ot-checkbox-row">
          <input id="ot-p-aprobado" type="checkbox" formControlName="presupuesto_aprobado" />
          <label for="ot-p-aprobado">Presupuesto aprobado por el cliente</label>
        </div>
      </form>
    </section>

    <app-ot-detalle-lineas
      [orden]="orden()"
      [editable]="true"
      [allowCreateServicio]="true"
      (ordenChange)="ordenChange.emit($event)"
      (errorChange)="errorChange.emit($event)"
    />
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtDiagnosticoStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly formReady = output<FormGroup>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly form = this.fb.group({
    fecha_inicio_estimada: [''],
    fecha_fin_estimada: [''],
    presupuesto_aprobado: [false],
  });

  ngOnInit(): void {
    this.formReady.emit(this.form);
    const o = this.orden();
    this.form.patchValue({
      fecha_inicio_estimada: this.formatDate(o.fecha_inicio_estimada),
      fecha_fin_estimada: this.formatDate(o.fecha_fin_estimada),
      presupuesto_aprobado: o.presupuesto_aprobado ?? false,
    });
  }

  buildInput(): OrdenTrabajoInput {
    const val = this.form.getRawValue();
    return {
      fecha_inicio_estimada: val.fecha_inicio_estimada
        ? new Date(val.fecha_inicio_estimada).toISOString()
        : null,
      fecha_fin_estimada: val.fecha_fin_estimada
        ? new Date(val.fecha_fin_estimada).toISOString()
        : null,
      presupuesto_aprobado: val.presupuesto_aprobado,
    };
  }

  private formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }
}
