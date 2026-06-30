import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GenericListPageComponent } from '../../../../../shared/components/generic-list-page/generic-list-page';
import { UsuariosListComponent } from '../usuarios-list/usuarios-list';

@Component({
  selector: 'app-usuarios-page',
  imports: [GenericListPageComponent],
  template: `
    <app-generic-list-page
      tabTitle="Lista de usuarios"
      [listComponent]="listComponent"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPageComponent {
  protected readonly listComponent = UsuariosListComponent;
}
