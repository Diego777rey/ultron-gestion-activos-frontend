import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export type OtSectionStatus = 'ok' | 'pending' | 'error' | 'none';

@Component({
  selector: 'app-ot-collapsible-section',
  template: `
    <section class="ot-section ot-section--card ot-section--collapsible">
      <button
        type="button"
        class="ot-section__toggle"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="panelId"
        (click)="toggle()"
      >
        <span class="ot-section__icon material-icons" aria-hidden="true">{{ icon() }}</span>
        <div class="ot-section__toggle-text">
          <div class="ot-section__toggle-title-row">
            <h3 class="ot-section-title">{{ title() }}</h3>
            @if (status() !== 'none') {
              <span
                class="ot-section__status"
                [class.ot-section__status--ok]="status() === 'ok'"
                [class.ot-section__status--pending]="status() === 'pending'"
                [class.ot-section__status--error]="status() === 'error'"
                [attr.aria-label]="statusLabel()"
              >
                <span class="material-icons" aria-hidden="true">{{ statusIcon() }}</span>
              </span>
            }
          </div>
          @if (expanded() && hint()) {
            <p class="ot-hint ot-hint--inline">{{ hint() }}</p>
          }
          @if (!expanded() && summary()) {
            <p class="ot-section__summary">{{ summary() }}</p>
          }
        </div>
        <span
          class="ot-section__chevron material-icons"
          [class.ot-section__chevron--open]="expanded()"
          aria-hidden="true"
        >expand_more</span>
      </button>

      <div
        [id]="panelId"
        class="ot-section__body"
        [hidden]="!expanded()"
      >
        <ng-content />
      </div>
    </section>
  `,
  styleUrls: ['../../styles/ot-form.scss', './ot-collapsible-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtCollapsibleSectionComponent {
  private static nextId = 0;
  protected readonly panelId = `ot-section-panel-${OtCollapsibleSectionComponent.nextId++}`;

  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly hint = input<string>('');
  readonly summary = input<string>('');
  readonly status = input<OtSectionStatus>('none');
  readonly expanded = model<boolean>(true);

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }

  protected statusIcon(): string {
    switch (this.status()) {
      case 'ok':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'pending':
        return 'radio_button_unchecked';
      default:
        return '';
    }
  }

  protected statusLabel(): string {
    switch (this.status()) {
      case 'ok':
        return 'Completo';
      case 'error':
        return 'Con errores';
      case 'pending':
        return 'Pendiente';
      default:
        return '';
    }
  }
}
