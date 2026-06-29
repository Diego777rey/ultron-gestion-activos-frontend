import { ChangeDetectionStrategy, Component, afterNextRender, inject, input, OnDestroy, Type } from '@angular/core';
import { TabsComponent } from '../tabs/tabs.component';
import { TabService } from '../../services/tab.service';

/**
 * Página contenedora que abre un listado dentro del sistema de pestañas.
 * Evita repetir la lógica de `TabService` en cada módulo.
 */
@Component({
  selector: 'app-generic-list-page',
  imports: [TabsComponent],
  template: `<app-tabs />`,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericListPageComponent implements OnDestroy {
  private readonly tabService = inject(TabService);

  readonly tabTitle = input.required<string>();
  readonly listComponent = input.required<Type<unknown>>();

  constructor() {
    afterNextRender(() => {
      this.tabService.removeAllTabs();
      this.tabService.addTab({
        title: this.tabTitle(),
        component: this.listComponent(),
      });
    });
  }

  ngOnDestroy(): void {
    this.tabService.removeAllTabs();
  }
}
