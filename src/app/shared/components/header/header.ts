import { Component, ChangeDetectionStrategy, output } from '@angular/core';

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

  onMenuClick() {
    this.toggleSidebar.emit();
  }
}
