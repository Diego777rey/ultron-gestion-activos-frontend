import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRouteReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    // Se conservan los segmentos vacios (sin filtrarlos) para que una ruta
    // contenedora y su hija con path '' no generen la misma clave. Ademas se
    // incluyen los parametros para distinguir, por ejemplo, ':id/editar'.
    return route.pathFromRoot
      .map(v => {
        const path = v.routeConfig && v.routeConfig.path ? v.routeConfig.path : '';
        const params = v.params && Object.keys(v.params).length
          ? ';' + Object.keys(v.params).map(k => `${k}=${v.params[k]}`).join(';')
          : '';
        return path + params;
      })
      .join('/');
  }

  /** Indica si la ruta corresponde a una pantalla real (hoja) que debe conservarse. */
  private esRutaHoja(route: ActivatedRouteSnapshot): boolean {
    return route.children.length === 0;
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Solo se conserva el estado de las pantallas hoja, nunca de las rutas
    // contenedoras/lazy, evitando colisiones de handles entre niveles.
    if (!this.esRutaHoja(route)) {
      return false;
    }
    // Rutas marcadas con `noReuse` (ej. steppers de alta) deben recrearse
    // siempre para arrancar con un estado limpio y no reatachar datos previos.
    if (route.data?.['noReuse']) {
      return false;
    }
    const key = this.getRouteKey(route);
    return key !== '' && !key.includes('pantalla-principal') && !key.includes('login');
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = this.getRouteKey(route);
    if (key) {
      if (handle) {
        this.storedRoutes.set(key, handle);
      } else {
        this.storedRoutes.delete(key);
      }
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (!this.esRutaHoja(route)) {
      return false;
    }
    // Rutas con `noReuse` nunca se reatachan; se limpia cualquier handle viejo.
    if (route.data?.['noReuse']) {
      const key = this.getRouteKey(route);
      if (key) {
        this.storedRoutes.delete(key);
      }
      return false;
    }
    const key = this.getRouteKey(route);
    return !!key && this.storedRoutes.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    if (!key) return null;
    return this.storedRoutes.get(key) || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig
      && JSON.stringify(future.params) === JSON.stringify(curr.params);
  }

  clear(): void {
    this.storedRoutes.clear();
  }
}
