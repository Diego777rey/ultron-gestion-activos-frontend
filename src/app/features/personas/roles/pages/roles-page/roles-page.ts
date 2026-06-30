import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GenericListPageComponent } from '../../../../../shared/components/generic-list-page/generic-list-page';
import { RolesListComponent } from '../roles-list/roles-list';

@Component({
  selector: 'app-roles-page',
  imports: [GenericListPageComponent],
  template: `
    <app-generic-list-page
      tabTitle="Lista de roles"
      [listComponent]="listComponent"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPageComponent {
  protected readonly listComponent = RolesListComponent;
}
