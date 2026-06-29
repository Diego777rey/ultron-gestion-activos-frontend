import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GenericListPageComponent } from '../../../../../shared/components/generic-list-page/generic-list-page';
import { ClientesListComponent } from '../clientes-list/clientes-list';

@Component({
  selector: 'app-clientes-page',
  imports: [GenericListPageComponent],
  template: `
    <app-generic-list-page
      tabTitle="Lista de clientes"
      [listComponent]="listComponent"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPageComponent {
  protected readonly listComponent = ClientesListComponent;
}
