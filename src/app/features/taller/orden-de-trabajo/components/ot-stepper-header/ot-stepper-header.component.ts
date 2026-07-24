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
      margin: -24px -32px 0;
      padding: 18px 32px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: #1a1a1a;
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
      background: rgba(255, 255, 255, 0.08);
      border: 2px solid rgba(255, 255, 255, 0.22);
      color: rgba(255, 255, 255, 0.75);
    }
    .stepper-step__circle .material-icons {
      font-size: 18px;
    }
    .stepper-step.active .stepper-step__circle {
      background: #43a047;
      border-color: #43a047;
      color: #fff;
      box-shadow: 0 0 0 4px rgba(67, 160, 71, 0.4);
    }
    .stepper-step.done .stepper-step__circle {
      background: #388e3c;
      border-color: #388e3c;
      color: #fff;
    }
    .stepper-step__label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.92);
    }
    .stepper-step.active .stepper-step__label {
      color: #43a047;
      font-weight: 700;
    }
    .stepper-connector {
      width: 48px;
      height: 2px;
      background: rgba(255, 255, 255, 0.35);
    }
    .stepper-connector.done {
      background: #43a047;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtStepperHeaderComponent {
  readonly steps = input.required<OtStepDef[]>();
  readonly currentStep = input.required<number>();
}
