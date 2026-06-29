import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { TabsComponent } from '../../../../../shared/components/tabs/tabs.component';
import { TabService } from '../../../../../shared/services/tab.service';
import { ClientesListComponent } from '../clientes-list/clientes-list';

@Component({
  selector: 'app-clientes-page',
  imports: [TabsComponent],
  template: `<app-tabs></app-tabs>`,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPageComponent implements OnInit, OnDestroy {
  private readonly tabService = inject(TabService);

  ngOnInit() {
    this.tabService.removeAllTabs();
    this.tabService.addTab({
      title: 'Lista de clientes',
      component: ClientesListComponent,
    });
  }

  ngOnDestroy() {
    this.tabService.removeAllTabs();
  }
}
