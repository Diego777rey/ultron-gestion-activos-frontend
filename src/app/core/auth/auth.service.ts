import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router, RouteReuseStrategy } from '@angular/router';
import { TabService } from '../../shared/services/tab.service';
import { AppRouteReuseStrategy } from '../../shared/strategies/route-reuse.strategy';
import { API_CONFIG } from '../../config/api.config';
import { LoginRequest, LoginResponse, normalizeLoginCredentials } from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tabService = inject(TabService);
  private routeReuseStrategy = inject(RouteReuseStrategy);

  isAuthenticated = signal<boolean>(this.hasToken());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const payload = normalizeLoginCredentials(credentials);

    return this.http.post<LoginResponse>(API_CONFIG.authLoginEndpoint, payload).pipe(
      tap((response) => {
        if (response?.token) {
          localStorage.setItem('token', response.token);
          this.isAuthenticated.set(true);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isAuthenticated.set(false);

    this.tabService.clear();

    if (this.routeReuseStrategy instanceof AppRouteReuseStrategy) {
      (this.routeReuseStrategy as AppRouteReuseStrategy).clear();
    }

    this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem('token');
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }
}
