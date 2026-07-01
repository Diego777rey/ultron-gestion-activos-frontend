import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleOutput } from '../../../roles/interfaces/role.interface';
import { RoleService } from '../../../roles/services/role.service';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioOutput } from '../../interfaces/usuario.interface';

/**
 * Panel expandible que muestra dos sub-tablas:
 * - Roles disponibles (con búsqueda y botón agregar)
 * - Roles asignados al usuario (con botón quitar)
 *
 * Es solo capa de presentación: delega las operaciones
 * de agregar/quitar al backend vía UsuarioService.
 */
@Component({
  selector: 'app-usuario-roles-panel',
  imports: [CommonModule],
  templateUrl: './usuario-roles-panel.html',
  styleUrl: './usuario-roles-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioRolesPanelComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly usuarioService = inject(UsuarioService);

  /** El usuario cuyo panel se muestra */
  readonly usuario = input.required<UsuarioOutput>();

  /** Emitido cuando se agregan/quitan roles para actualizar la lista padre */
  readonly usuarioUpdated = output<UsuarioOutput>();

  /** Roles disponibles y actuales manejados con paginación */
  protected readonly availableRoles = signal<RoleOutput[]>([]);
  protected readonly currentRoles = signal<RoleOutput[]>([]);

  /** Estado de paginación */
  protected readonly pageAvailable = signal(0);
  protected readonly pageCurrent = signal(0);
  protected readonly hasMoreAvailable = signal(false);
  protected readonly hasMoreCurrent = signal(false);

  protected readonly loadingAvailable = signal(false);
  protected readonly loadingCurrent = signal(false);

  /** Filtros de búsqueda para roles disponibles y actuales */
  protected readonly searchFilter = signal('');
  protected readonly searchFilterCurrent = signal('');

  /** Estado de operaciones en progreso */
  protected readonly processing = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCurrentRoles(0);
    this.loadAvailableRoles(0);
  }

  private loadCurrentRoles(page: number, filter: string = this.searchFilterCurrent()): void {
    if (page === 0) {
      this.currentRoles.set([]);
    }
    this.loadingCurrent.set(true);
    this.usuarioService.rolesUsuarioPaginado(String(this.usuario().id), page, 25, filter).subscribe({
      next: (res) => {
        const current = page === 0 ? [] : this.currentRoles();
        this.currentRoles.set([...current, ...res.content]);
        this.pageCurrent.set(page);
        this.hasMoreCurrent.set(res.pageInfo.totalPages > page + 1);
        this.loadingCurrent.set(false);
      },
      error: () => this.loadingCurrent.set(false),
    });
  }

  private loadAvailableRoles(page: number, filter: string = this.searchFilter()): void {
    if (page === 0) {
      this.availableRoles.set([]);
    }
    this.loadingAvailable.set(true);
    this.usuarioService.rolesDisponiblesUsuarioPaginado(String(this.usuario().id), page, 25, filter).subscribe({
      next: (res) => {
        const current = page === 0 ? [] : this.availableRoles();
        this.availableRoles.set([...current, ...res.content]);
        this.pageAvailable.set(page);
        this.hasMoreAvailable.set(res.pageInfo.totalPages > page + 1);
        this.loadingAvailable.set(false);
      },
      error: () => this.loadingAvailable.set(false),
    });
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchFilter.set(value);
    this.loadAvailableRoles(0, value);
  }

  protected onSearchInputCurrent(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchFilterCurrent.set(value);
    this.loadCurrentRoles(0, value);
  }

  protected loadMoreAvailable(): void {
    if (!this.loadingAvailable() && this.hasMoreAvailable()) {
      this.loadAvailableRoles(this.pageAvailable() + 1);
    }
  }

  protected loadMoreCurrent(): void {
    if (!this.loadingCurrent() && this.hasMoreCurrent()) {
      this.loadCurrentRoles(this.pageCurrent() + 1);
    }
  }

  protected agregarRol(role: RoleOutput): void {
    const usuarioId = this.usuario().id;
    const roleId = role.id;
    if (!usuarioId || !roleId) return;

    this.processing.set(roleId);
    this.usuarioService.agregarRol(String(usuarioId), String(roleId)).subscribe({
      next: (updated: UsuarioOutput) => {
        this.usuarioUpdated.emit(updated);
        // Refresh local data
        this.loadAvailableRoles(0);
        this.loadCurrentRoles(0);
        this.processing.set(null);
      },
      error: () => this.processing.set(null),
    });
  }

  protected quitarRol(role: RoleOutput): void {
    const usuarioId = this.usuario().id;
    const roleId = role.id;
    if (!usuarioId || !roleId) return;

    this.processing.set(roleId);
    this.usuarioService.quitarRol(String(usuarioId), String(roleId)).subscribe({
      next: (updated: UsuarioOutput) => {
        this.usuarioUpdated.emit(updated);
        // Refresh local data
        this.loadAvailableRoles(0);
        this.loadCurrentRoles(0);
        this.processing.set(null);
      },
      error: () => this.processing.set(null),
    });
  }

  protected isProcessing(roleId?: string | null): boolean {
    return roleId !== null && roleId !== undefined && this.processing() === roleId;
  }
}
