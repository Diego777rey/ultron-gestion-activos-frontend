import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { APP_VERSION } from '../../../config/app-version';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-header-container'
  }
})
export class HeaderComponent {
  toggleSidebar = output<void>();
  protected readonly version = APP_VERSION;

  onMenuClick() {
    this.toggleSidebar.emit();
  }
}
