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
      label: 'Ventas',
      icon: 'point_of_sale',
      children: [
        { label: 'Punto de Venta', icon: 'storefront', route: '/ventas/punto-de-venta' },
      ]
    },
    {
      label: 'Taller',
      icon: 'construction',
      children: [
        { label: 'Orden de Trabajo', icon: 'assignment', route: '/taller/orden-de-trabajo' },
      ]
    },
    { label: 'Vehículos', icon: 'directions_car', route: '/activos/vehiculos' },
    {
      label: 'Financiero',
      icon: 'account_balance',
      children: [
        { label: 'Maletines', icon: 'business_center', route: '/financiero/maletines' },
        { label: 'Cajas', icon: 'account_balance_wallet', route: '/financiero/cajas' },
      ]
    },
    {
      label: 'Servicios',
      icon: 'handyman',
      children: [
        { label: 'Servicios', icon: 'build', route: '/inventario/servicios' },
        { label: 'Categoría Servicios', icon: 'category', route: '/inventario/servicios/categorias' },
      ]
    },
    {
      label: 'Productos',
      icon: 'inventory_2',
      children: [
        { label: 'Productos', icon: 'inventory', route: '/inventario/productos' },
        { label: 'Categoría Productos', icon: 'category', route: '/inventario/productos/categorias' },
        { label: 'Presentaciones', icon: 'layers', route: '/inventario/productos/presentaciones' },
      ]
    },
    {
      label: 'R.R.H.H.',
      icon: 'people',
      children: [
        { label: 'Clientes', icon: 'groups', route: '/personas/clientes' },
        { label: 'Funcionarios', icon: 'recent_actors', route: '/personas/funcionarios' },
        { label: 'Usuarios', icon: 'account_circle', route: '/personas/usuarios' },
        { label: 'Roles', icon: 'shield', route: '/personas/roles' },
      ]
    },
    {
      label: 'Sectores',
      icon: 'map',
      children: [
        { label: 'Sectores', icon: 'grid_view', route: '/sectores' },
        { label: 'Zonas', icon: 'place', route: '/sectores/zonas' },
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
    if (url.includes('vehiculos')) return 'Lista de vehículos';
    if (url.includes('clientes')) return 'Lista de clientes';
    if (url.includes('funcionarios')) return 'Lista de funcionarios';
    if (url.includes('usuarios')) return 'Lista de usuarios';
    if (url.includes('roles')) return 'Lista de roles';
    if (url.includes('maletines')) return 'Maletines';
    if (url.includes('cajas')) return 'Cajas';
    if (url.includes('productos/presentaciones')) return 'Presentaciones';
    if (url.includes('productos/categorias')) return 'Categorías de Productos';
    if (url.includes('productos')) return 'Productos';
    if (url.includes('servicios/categorias')) return 'Categorías de Servicios';
    if (url.includes('servicios')) return 'Servicios';
    if (url.includes('sectores/zonas')) return 'Zonas';
    if (url.includes('sectores')) return 'Sectores';
    return 'Pantalla';
  }

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }
}
