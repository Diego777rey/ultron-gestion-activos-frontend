import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GenericListPageComponent } from '../../../../../shared/components/generic-list-page/generic-list-page';
import { FuncionariosListComponent } from '../funcionarios-list/funcionarios-list';

@Component({
  selector: 'app-funcionarios-page',
  imports: [GenericListPageComponent],
  template: `
    <app-generic-list-page
      tabTitle="Lista de funcionarios"
      [listComponent]="listComponent"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionariosPageComponent {
  protected readonly listComponent = FuncionariosListComponent;
}
