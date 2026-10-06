import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../ui-button/ui-button';

@Component({
  selector: 'app-confirm-dialog',
  imports: [UiButtonComponent],
  template: `
    <p class="confirm-dialog__message">{{ message() }}</p>
    <div class="confirm-dialog__footer">
      <app-ui-button type="button" label="Cancelar" icon="close" variant="ghost" (clicked)="cancelar()" />
      <app-ui-button
        type="button"
        [label]="confirmLabel()"
        icon="delete"
        variant="danger"
        (clicked)="confirmar()"
      />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .confirm-dialog__message {
      margin: 0;
      font-size: 14px;
      line-height: 1.45;
      color: var(--text-primary);
    }

    .confirm-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(DialogRef<boolean | undefined>, { optional: true });

  readonly message = input('¿Confirmar esta acción?');
  readonly confirmLabel = input('Eliminar');

  protected cancelar(): void {
    this.dialogRef?.close(false);
  }

  protected confirmar(): void {
    this.dialogRef?.close(true);
  }
}
