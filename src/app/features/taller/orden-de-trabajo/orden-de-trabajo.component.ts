import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-orden-de-trabajo',
  imports: [],
  templateUrl: './orden-de-trabajo.component.html',
  styleUrl: './orden-de-trabajo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class OrdenDeTrabajoComponent {}
