import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { MenuItem } from '../../shared/models/menu-item.model';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-layout-root'
  }
})
export class MainLayoutComponent {
  sidebarOpen = signal(true);

  menuItems: MenuItem[] = [
    {
      label: 'Home',
      icon: 'home',
      route: '/pantalla-principal',
      category: 'GENERAL'
    },
    {
      label: 'Clientes',
      icon: 'groups',
      route: '/personas/clientes',
      category: 'PERSONAS'
    }
  ];

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }
}
