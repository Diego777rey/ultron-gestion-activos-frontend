import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EtapaOrdenTrabajo } from '../../interfaces/orden-trabajo.interface';

export interface OtStepDef {
  index: number;
  etapa: EtapaOrdenTrabajo;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-ot-stepper-header',
  template: `
    <header class="stepper-header" role="navigation" aria-label="Etapas de la orden">
      @for (step of steps(); track step.index) {
        <div
          class="stepper-step"
          [class.active]="currentStep() === step.index"
          [class.done]="currentStep() > step.index"
        >
          <span class="stepper-step__circle" aria-hidden="true">
            @if (currentStep() > step.index) {
              <span class="material-icons">check</span>
            } @else {
              <span class="material-icons">{{ step.icon }}</span>
            }
          </span>
          <span class="stepper-step__label">{{ step.label }}</span>
        </div>
        @if (!$last) {
          <span class="stepper-connector" [class.done]="currentStep() > step.index" aria-hidden="true"></span>
        }
      }
    </header>
  `,
  styles: `
    .stepper-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 0 16px;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
    }
    .stepper-step {
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0.55;
    }
    .stepper-step.active,
    .stepper-step.done {
      opacity: 1;
    }
    .stepper-step__circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #3c3c3c;
      border: 2px solid var(--border-color);
      color: var(--text-secondary);
    }
    .stepper-step__circle .material-icons {
      font-size: 18px;
    }
    .stepper-step.active .stepper-step__circle {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: #fff;
    }
    .stepper-step.done .stepper-step__circle {
      background: #3b883f;
      border-color: #3b883f;
      color: #fff;
    }
    .stepper-step__label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
    .stepper-connector {
      width: 48px;
      height: 2px;
      background: var(--border-color);
    }
    .stepper-connector.done {
      background: #3b883f;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtStepperHeaderComponent {
  readonly steps = input.required<OtStepDef[]>();
  readonly currentStep = input.required<number>();
}
