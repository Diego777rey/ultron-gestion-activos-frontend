import { Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Directiva genérica que emite un evento cuando se hace click fuera del elemento.
 * Útil para cerrar menús desplegables, popovers y paneles flotantes.
 *
 * Uso: `<div (appClickOutside)="cerrar()">...</div>`
 */
@Directive({
  selector: '[appClickOutside]',
  host: {
    '(document:pointerdown)': 'onDocumentClick($event)',
  },
})
export class ClickOutsideDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Se emite cuando el click ocurre fuera del elemento anfitrión. */
  readonly appClickOutside = output<void>();

  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.appClickOutside.emit();
    }
  }
}
