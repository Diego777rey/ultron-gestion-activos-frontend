import { Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { MenuItem } from '../../models/menu-item.model';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.expanded]': 'isExpanded()',
    '(click)': 'onSideNavClick()'
  }
})
export class SidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  items = input<MenuItem[]>([]);
  userName = input<string>('Diego Paulinho Amarilla Mercado');
  
  isExpanded = input<boolean>(false);
  isExpandedChange = output<boolean>();

  /** Tracks which parent menu items are expanded. Key = item label. */
  expandedMenus = signal<Set<string>>(new Set<string>());

  ngOnInit(): void {
    this.syncExpandedMenus(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.syncExpandedMenus((event as NavigationEnd).urlAfterRedirects);
      });
  }

  onSideNavClick(): void {
    if (!this.isExpanded()) {
      this.isExpandedChange.emit(true);
    }
  }

  toggleSubmenu(item: MenuItem, event: Event): void {
    event.stopPropagation();

    if (!this.isExpanded()) {
      this.isExpandedChange.emit(true);
      this.expandedMenus.set(new Set([item.label]));
      this.navigateToFirstChild(item);
      return;
    }

    this.expandedMenus.update((set) => {
      const copy = new Set(set);
      if (copy.has(item.label)) {
        copy.delete(item.label);
      } else {
        copy.clear();
        copy.add(item.label);
      }
      return copy;
    });
  }

  onChildClick(event: Event): void {
    event.stopPropagation();
  }

  isMenuExpanded(item: MenuItem): boolean {
    return this.expandedMenus().has(item.label);
  }

  private syncExpandedMenus(url: string): void {
    for (const item of this.items()) {
      const matchesChild = item.children?.some(
        (child) => child.route && url.startsWith(child.route)
      );
      if (matchesChild) {
        this.expandedMenus.update((set) => new Set([...set, item.label]));
        return;
      }
    }
  }

  private navigateToFirstChild(item: MenuItem): void {
    const firstRoute = item.children?.find((child) => child.route)?.route;
    if (firstRoute && !this.router.url.startsWith(firstRoute)) {
      void this.router.navigateByUrl(firstRoute);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
