import { Component, ChangeDetectionStrategy, signal, inject, OnInit, DestroyRef, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, ActivatedRoute, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from '../../shared/components/header/header';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';
import { MenuItem } from '../../shared/models/menu-item.model';
import { TabService } from '../../shared/services/tab.service';
import { PermissionService } from '../../core/auth/permission.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, TabsComponent],
  template: `
    <app-header (toggleSidebar)="toggleSidebar()"></app-header>
    
    <div class="layout-body">
      <app-sidebar 
        [items]="menuItems()" 
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
    class: 'app-layout-root',
    '[class.sidebar-expanded]': 'sidebarOpen()',
  }
})
export class MainLayoutComponent implements OnInit {
  sidebarOpen = signal(false);
  
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private tabService = inject(TabService);
  private destroyRef = inject(DestroyRef);
  private permissionService = inject(PermissionService);

  private allMenuItems: MenuItem[] = [
    {
      label: 'Ventas',
      icon: 'point_of_sale',
      requiredPermissions: ['VENTAS'],
      children: [
        { label: 'Punto de Venta', icon: 'storefront', route: '/ventas/punto-de-venta', requiredPermissions: ['VENTAS'] },
      ]
    },
    {
      label: 'Taller',
      icon: 'construction',
      requiredPermissions: ['TALLER', 'ORDEN_TRABAJO'],
      children: [
        { label: 'Orden de Trabajo', icon: 'assignment', route: '/taller/orden-de-trabajo', requiredPermissions: ['ORDEN_TRABAJO'] },
      ]
    },
    {
      label: 'Operaciones',
      icon: 'sync_alt',
      requiredPermissions: ['OPERACIONES', 'TRANSFERENCIAS', 'SOLICITUDES_REPUESTO'],
      children: [
        {
          label: 'Transferencias',
          icon: 'history',
          route: '/taller/operaciones/transferencia',
          requiredPermissions: ['TRANSFERENCIAS'],
        },
        {
          label: 'Solicitudes de repuesto',
          icon: 'request_quote',
          route: '/taller/operaciones/transferencia/solicitudes',
          requiredPermissions: ['SOLICITUDES_REPUESTO'],
        },
      ],
    },
    { label: 'Vehículos', icon: 'directions_car', route: '/activos/vehiculos', requiredPermissions: ['VEHICULOS'] },
    { label: 'Equipos', icon: 'memory', route: '/activos/equipos', requiredPermissions: ['EQUIPOS', 'VEHICULOS'] },
    {
      label: 'Financiero',
      icon: 'account_balance',
      requiredPermissions: ['FINANCIERO', 'MALETINES', 'CAJAS', 'COTIZACIONES'],
      children: [
        { label: 'Maletines', icon: 'business_center', route: '/financiero/maletines', requiredPermissions: ['MALETINES'] },
        { label: 'Cajas', icon: 'account_balance_wallet', route: '/financiero/cajas', requiredPermissions: ['CAJAS'] },
        { label: 'Últimas cajas', icon: 'history', route: '/financiero/ultimas', requiredPermissions: ['CAJAS'] },
        { label: 'Cotización', icon: 'currency_exchange', route: '/financiero/cotizaciones', requiredPermissions: ['COTIZACIONES'] },
        { label: 'Datos de facturación', icon: 'receipt_long', route: '/financiero/facturacion', requiredPermissions: ['FINANCIERO'] },
        { label: 'Timbrados', icon: 'confirmation_number', route: '/financiero/facturacion/timbrados', requiredPermissions: ['FINANCIERO'] },
      ]
    },
    {
      label: 'Servicios',
      icon: 'handyman',
      route: '/inventario/servicios',
      requiredPermissions: ['SERVICIOS'],
    },
    {
      label: 'Productos',
      icon: 'inventory_2',
      route: '/inventario/productos',
      requiredPermissions: ['PRODUCTOS'],
    },
    {
      label: 'R.R.H.H.',
      icon: 'people',
      requiredPermissions: ['RRHH', 'CLIENTES', 'FUNCIONARIOS', 'USUARIOS', 'ROLES', 'EMPRESAS'],
      children: [
        { label: 'Clientes', icon: 'groups', route: '/personas/clientes', requiredPermissions: ['CLIENTES'] },
        { label: 'Funcionarios', icon: 'recent_actors', route: '/personas/funcionarios', requiredPermissions: ['FUNCIONARIOS'] },
        { label: 'Usuarios', icon: 'account_circle', route: '/personas/usuarios', requiredPermissions: ['USUARIOS'] },
        { label: 'Roles', icon: 'shield', route: '/personas/roles', requiredPermissions: ['ROLES'] },
        { label: 'Empresas', icon: 'business', route: '/personas/empresas', requiredPermissions: ['EMPRESAS'] },
      ]
    },
    {
      label: 'Sectores',
      icon: 'map',
      requiredPermissions: ['SECTORES'],
      children: [
        { label: 'Sectores', icon: 'grid_view', route: '/sectores', requiredPermissions: ['SECTORES'] },
      ]
    },
    {
      label: 'Reporte',
      icon: 'summarize',
      requiredPermissions: ['REPORTES'],
      children: [
        {
          label: 'Visor de reportes',
          icon: 'picture_as_pdf',
          route: '/reportes/visor',
          requiredPermissions: ['REPORTES'],
        },
        {
          label: 'Detalle de orden de trabajo',
          icon: 'assignment',
          route: '/reportes/orden-de-trabajo',
          requiredPermissions: ['REPORTES'],
        },
      ],
    },
  ];

  menuItems = computed(() => this.filterMenuItems(this.allMenuItems));

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
    if (url.includes('activos/equipos')) return 'Lista de equipos';
    if (url.includes('clientes')) return 'Lista de clientes';
    if (url.includes('funcionarios')) return 'Lista de funcionarios';
    if (url.includes('usuarios')) return 'Lista de usuarios';
    if (url.includes('roles')) return 'Lista de roles';
    if (url.includes('empresas')) return 'Empresas';
    if (url.includes('maletines')) return 'Maletines';
    if (url.includes('ultimas') && url.includes('/ventas')) return 'Ventas de la caja';
    if (url.includes('ultimas')) return 'Últimas cajas';
    if (url.includes('facturacion/timbrados')) return 'Timbrados';
    if (url.includes('facturacion')) return 'Datos de facturación';
    if (url.includes('cotizaciones')) return 'Cotizaciones';
    if (url.includes('cajas')) return 'Cajas';
    if (url.includes('productos/nuevo')) return 'Nuevo Producto';
    if (url.includes('productos/') && url.includes('/editar')) return 'Editar Producto';
    if (url.includes('productos/categorias')) return 'Categorías de Productos';
    if (url.includes('productos')) return 'Productos';
    if (url.includes('servicios/nuevo')) return 'Nuevo Servicio';
    if (url.includes('servicios/categorias')) return 'Categorías de Servicios';
    if (url.includes('servicios')) return 'Servicios';
    if (url.includes('sectores/zonas')) return 'Zonas';
    if (url.includes('sectores')) return 'Sectores';
    if (url.includes('operaciones/transferencia/solicitudes')) return 'Solicitudes de repuestos';
    if (url.includes('operaciones/transferencia')) return 'Transferencias';
    if (url.includes('orden-de-trabajo')) return 'Orden de Trabajo';
    if (url.includes('taller/historial')) return 'Historial';
    if (url.includes('taller/calendario')) return 'Calendario';
    if (url.includes('reportes/visor')) return 'Reportes';
    if (url.includes('reportes/orden-de-trabajo')) return 'Detalle de orden de trabajo';
    return 'Pantalla';
  }

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }

  private filterMenuItems(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => this.hasPermissionForItem(item))
      .map(item => {
        if (item.children) {
          const filteredChildren = this.filterMenuItems(item.children);
          return filteredChildren.length > 0
            ? { ...item, children: filteredChildren }
            : null;
        }
        return item;
      })
      .filter((item): item is MenuItem => item !== null);
  }

  private hasPermissionForItem(item: MenuItem): boolean {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true;
    }
    return this.permissionService.canAccessAnyModule(item.requiredPermissions);
  }
}
