import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Paso "Datos generales" de los asistentes de inventario: resumen a la
 * izquierda y ficha a la derecha.
 *
 * Huecos: contenido sin atributo va al resumen; `app-ficha-stat` a la cabecera
 * de la ficha; `[fichaAcciones]` a la derecha de esa cabecera; `[fichaCuerpo]`
 * debajo de ella.
 */
@Component({
  selector: 'app-ficha-layout',
  template: `
    <aside class="resumen">
      <h2 class="resumen__titulo">{{ titulo() }}</h2>
      <ng-content />
    </aside>

    <div class="ficha">
      <header class="ficha__top">
        <div class="ficha__stats">
          <ng-content select="app-ficha-stat" />
        </div>
        <ng-content select="[fichaAcciones]" />
      </header>
      <ng-content select="[fichaCuerpo]" />
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      flex: 1;
      min-height: 0;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
      background: #1e1e1e;
    }

    .resumen {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
      padding: 18px 16px 20px;
      overflow: auto;
      background: #2a2a2a;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    .resumen__titulo {
      margin: 0 0 8px;
      text-align: center;
      font-size: 15px;
      font-weight: 500;
      color: #f0f0f0;
    }

    .ficha {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: #242424;
    }

    .ficha__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 16px 12px;
    }

    .ficha__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 28px 48px;
    }

    @media (max-width: 640px) {
      :host {
        grid-template-columns: 1fr;
        overflow: auto;
      }

      .resumen {
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaLayoutComponent {
  readonly titulo = input.required<string>();
}
