import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Dato destacado de la cabecera de `app-ficha-layout` (ej: precio de venta). */
@Component({
  selector: 'app-ficha-stat',
  template: `
    <span>{{ label() }}</span>
    <strong>{{ valor() }}</strong>
  `,
  styles: `
    :host {
      display: block;
    }

    span {
      display: block;
      margin-bottom: 2px;
      font-size: 12px;
      font-weight: 600;
      color: #64b5f6;
    }

    strong {
      font-size: 16px;
      font-weight: 600;
      color: #90caf9;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaStatComponent {
  readonly label = input.required<string>();
  readonly valor = input.required<string>();
}
