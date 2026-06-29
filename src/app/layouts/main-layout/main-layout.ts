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
      label: 'R.R.H.H.',
      icon: 'people',
      children: [
        { label: 'Clientes', icon: 'groups', route: '/personas/clientes' },
        { label: 'Funcionarios', icon: 'recent_actors', route: '/personas/funcionarios' },
        { label: 'Usuarios', icon: 'account_circle', route: '/personas/usuarios' },
        { label: 'Roles', icon: 'shield', route: '/personas/roles' },
      ]
    }
  ];

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }
}
