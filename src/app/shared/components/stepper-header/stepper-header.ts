import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface StepperStep {
  index: number;
  label: string;
  icon: string;
}

export type StepperAccent = 'primary' | 'success';

/**
 * Encabezado de pasos de los asistentes (wizard).
 *
 * Sin `reachedStep`, los pasos anteriores al actual se marcan como hechos y
 * todos se pueden elegir. Con `reachedStep`, solo se marcan hechos los pasos
 * anteriores a esa etapa y los posteriores quedan bloqueados.
 *
 * La página que lo usa define su ubicación (margen) y puede ajustar el relleno
 * con la variable CSS `--stepper-header-padding`.
 */
@Component({
  selector: 'app-stepper-header',
  imports: [NgTemplateOutlet],
  templateUrl: './stepper-header.html',
  styleUrl: './stepper-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.stepper-header--success]': "accent() === 'success'" },
})
export class StepperHeaderComponent {
  readonly steps = input.required<readonly StepperStep[]>();
  /** Paso que se está mostrando. */
  readonly currentStep = input.required<number>();
  /** Última etapa alcanzada. Null: avance lineal según el paso actual. */
  readonly reachedStep = input<number | null>(null);
  /** Si es false, los pasos solo se muestran y no se pueden elegir. */
  readonly navigable = input(true);
  readonly accent = input<StepperAccent>('primary');
  readonly ariaLabel = input('Pasos');

  readonly stepSelect = output<number>();

  protected isDone(index: number): boolean {
    const reached = this.reachedStep();
    if (reached == null) {
      return this.currentStep() > index;
    }
    return reached > index && this.currentStep() !== index;
  }

  protected isReached(index: number): boolean {
    const reached = this.reachedStep();
    return reached != null && reached === index && this.currentStep() !== index;
  }

  protected isLocked(index: number): boolean {
    const reached = this.reachedStep();
    return reached != null && index > reached;
  }

  protected isConnectorDone(index: number): boolean {
    return (this.reachedStep() ?? this.currentStep()) > index;
  }
}
