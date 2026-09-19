import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router, RouteReuseStrategy } from '@angular/router';
import { TabService } from '../../shared/services/tab.service';
import { ReporteVisorService } from '../../shared/services/reporte-visor.service';
import { AppRouteReuseStrategy } from '../../shared/strategies/route-reuse.strategy';
import { API_CONFIG } from '../../config/api.config';
import { LoginRequest, LoginResponse, normalizeLoginCredentials } from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly USERNAME_KEY = 'username';

  private http = inject(HttpClient);
  private router = inject(Router);
  private tabService = inject(TabService);
  private reporteVisor = inject(ReporteVisorService);
  private routeReuseStrategy = inject(RouteReuseStrategy);

  isAuthenticated = signal<boolean>(this.hasToken());
  readonly currentUsername = signal<string>(this.readStoredUsername());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const payload = normalizeLoginCredentials(credentials);

    return this.http.post<LoginResponse>(API_CONFIG.authLoginEndpoint, payload).pipe(
      tap((response) => {
        if (response?.token) {
          localStorage.setItem(AuthService.TOKEN_KEY, response.token);
          this.persistUsername(response.username || this.usernameFromToken(response.token));
          this.isAuthenticated.set(true);
        }
      })
    );
  }

  logout(): void {
    this.clearSession();

    this.tabService.clear();
    this.reporteVisor.limpiar();

    if (this.routeReuseStrategy instanceof AppRouteReuseStrategy) {
      (this.routeReuseStrategy as AppRouteReuseStrategy).clear();
    }

    this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USERNAME_KEY);
    this.currentUsername.set('');
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  private persistUsername(username: string | null | undefined): void {
    const normalized = username?.trim() ?? '';
    if (normalized) {
      localStorage.setItem(AuthService.USERNAME_KEY, normalized);
    } else {
      localStorage.removeItem(AuthService.USERNAME_KEY);
    }
    this.currentUsername.set(normalized);
  }

  private readStoredUsername(): string {
    const stored = localStorage.getItem(AuthService.USERNAME_KEY)?.trim();
    if (stored) {
      return stored;
    }
    const fromToken = this.usernameFromToken(this.getToken());
    if (fromToken) {
      localStorage.setItem(AuthService.USERNAME_KEY, fromToken);
    }
    return fromToken;
  }

  private usernameFromToken(token: string | null): string {
    if (!token) {
      return '';
    }
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return '';
      }
      const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as { sub?: string; username?: string };
      return (payload.sub || payload.username || '').trim();
    } catch {
      return '';
    }
  }
}
