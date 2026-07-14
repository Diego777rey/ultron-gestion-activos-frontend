import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppRouteReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    return route.pathFromRoot
      .map(v => v.routeConfig && v.routeConfig.path ? v.routeConfig.path : '')
      .filter(p => p !== '')
      .join('/');
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
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
    const key = this.getRouteKey(route);
    return !!key && this.storedRoutes.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    if (!key) return null;
    return this.storedRoutes.get(key) || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  clear(): void {
    this.storedRoutes.clear();
  }
}
