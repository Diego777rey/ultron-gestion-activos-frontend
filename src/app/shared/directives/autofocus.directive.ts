import { AfterViewInit, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Directiva genérica que coloca el foco en el elemento al renderizarse.
 * Mejora la accesibilidad y la UX en formularios y diálogos.
 *
 * Uso: `<input appAutofocus>` o `<input [appAutofocus]="condicion">`
 */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Permite activar/desactivar el autofoco. Por defecto está activo. */
  readonly appAutofocus = input<boolean | ''>('');

  ngAfterViewInit(): void {
    const enabled = this.appAutofocus() !== false;
    if (enabled) {
      queueMicrotask(() => this.elementRef.nativeElement.focus());
    }
  }
}
