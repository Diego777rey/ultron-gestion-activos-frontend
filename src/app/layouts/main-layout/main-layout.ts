import { Component, ChangeDetectionStrategy, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, ActivatedRoute, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from '../../shared/components/header/header';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';
import { MenuItem } from '../../shared/models/menu-item.model';
import { TabService } from '../../shared/services/tab.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, TabsComponent],
  template: `
    <app-header (toggleSidebar)="toggleSidebar()"></app-header>
    
    <div class="layout-body">
      <app-sidebar 
        [items]="menuItems" 
        userName="Diego Paulinho Amarilla Mercado"
        [isExpanded]="sidebarOpen()"
        (isExpandedChange)="sidebarOpen.set($event)"
      ></app-sidebar>
      
      <main class="main-content">
        <app-tabs></app-tabs>
        <div class="main-content__outlet">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-layout-root'
  }
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = signal(false);
  
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private tabService = inject(TabService);
  private destroyRef = inject(DestroyRef);

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

  ngOnInit(): void {
    // Escuchar cambios de ruta para agregar/activar tabs automáticamente
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      // Buscar título en las rutas (asumiendo que las rutas hijas lo tengan en data)
      let currentRoute = this.activatedRoute.root;
      while (currentRoute.children[0]) {
        currentRoute = currentRoute.children[0];
      }
      
      const title = currentRoute.snapshot.data['tabTitle'] || this.getTitleFromUrl(url);
      
      if (url !== '/pantalla-principal' && url !== '/') {
        this.tabService.addTab(title, url);
      }
    });
  }

  private getTitleFromUrl(url: string): string {
    if (url.includes('clientes')) return 'Lista de clientes';
    if (url.includes('funcionarios')) return 'Lista de funcionarios';
    if (url.includes('usuarios')) return 'Lista de usuarios';
    if (url.includes('roles')) return 'Lista de roles';
    return 'Pantalla';
  }

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }
}
