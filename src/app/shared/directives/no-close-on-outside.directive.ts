import { Directive, input } from '@angular/core';

/**
 * Impide que un diálogo/modal se cierre al hacer click fuera (backdrop).
 *
 * Se aplica automáticamente a todos los `<app-modal>`.
 * También puede usarse de forma explícita en cualquier diálogo:
 *
 * ```html
 * <app-modal appNoCloseOnOutside></app-modal>
 * ```
 *
 * Para permitir el cierre al click fuera en un caso puntual:
 * `<app-modal [appNoCloseOnOutside]="false">`
 */
@Directive({
  selector: '[appNoCloseOnOutside]',
})
export class NoCloseOnOutsideDirective {
  /** Activo por defecto. `false` permite cerrar al click fuera. */
  readonly appNoCloseOnOutside = input<boolean | ''>(true);

  isEnabled(): boolean {
    return this.appNoCloseOnOutside() !== false;
  }
}
