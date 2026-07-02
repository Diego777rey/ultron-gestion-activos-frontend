import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router, RouteReuseStrategy } from '@angular/router';
import { TabService } from '../../shared/services/tab.service';
import { AppRouteReuseStrategy } from '../../shared/strategies/route-reuse.strategy';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tabService = inject(TabService);
  private routeReuseStrategy = inject(RouteReuseStrategy);

  // Using signals for state management as per AGENTS.md
  isAuthenticated = signal<boolean>(this.hasToken());
  
  private apiUrl = 'http://localhost:8081/api/auth/login';

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          this.isAuthenticated.set(true);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.isAuthenticated.set(false);
    
    // Clear tabs
    this.tabService.clear();

    // Clear route cache
    if (this.routeReuseStrategy instanceof AppRouteReuseStrategy) {
      (this.routeReuseStrategy as AppRouteReuseStrategy).clear();
    }

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }
}
