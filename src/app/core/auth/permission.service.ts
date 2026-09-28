import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);

  canAccessModule(modulo: string): boolean {
    return this.authService.hasPermission(modulo, 'VER');
  }

  canAccessAnyModule(modulos: string[]): boolean {
    return this.authService.hasAnyPermission(modulos, 'VER');
  }

  canCreate(modulo: string): boolean {
    return this.authService.hasPermission(modulo, 'CREAR');
  }

  canEdit(modulo: string): boolean {
    return this.authService.hasPermission(modulo, 'EDITAR');
  }

  canDelete(modulo: string): boolean {
    return this.authService.hasPermission(modulo, 'ELIMINAR');
  }
}
