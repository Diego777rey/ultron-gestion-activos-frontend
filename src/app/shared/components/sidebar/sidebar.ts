import { Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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

  /** Tracks which parent menu items are expanded. Key = item label or nested key. */
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

  menuKey(parent: MenuItem, child: MenuItem): string {
    return `${parent.label}/${child.label}`;
  }

  toggleSubmenu(item: MenuItem, event: Event): void {
    event.stopPropagation();

    if (!this.isExpanded()) {
      this.isExpandedChange.emit(true);
      this.expandedMenus.set(new Set([item.label]));
      this.navigateToFirstRoute(item);
      return;
    }

    this.expandedMenus.update((set) => {
      const copy = new Set(set);
      if (copy.has(item.label)) {
        copy.delete(item.label);
        for (const key of [...copy]) {
          if (key.startsWith(item.label + '/')) {
            copy.delete(key);
          }
        }
      } else {
        // Keep other top-level menus closed (accordion)
        const next = new Set<string>();
        next.add(item.label);
        return next;
      }
      return copy;
    });
  }

  toggleNestedSubmenu(parent: MenuItem, child: MenuItem, event: Event): void {
    event.stopPropagation();
    const key = this.menuKey(parent, child);
    this.expandedMenus.update((set) => {
      const copy = new Set(set);
      copy.add(parent.label);
      if (copy.has(key)) {
        copy.delete(key);
      } else {
        copy.add(key);
      }
      return copy;
    });
  }

  onChildClick(event: Event): void {
    event.stopPropagation();
  }

  isMenuExpanded(key: string): boolean {
    return this.expandedMenus().has(key);
  }

  isChildExact(item: MenuItem, child: MenuItem): boolean {
    if (!child.route || child.route === '/' || child.route === '') {
      return true;
    }
    return (item.children ?? []).some(
      (sibling) =>
        sibling !== child &&
        !!sibling.route &&
        sibling.route.startsWith(child.route + '/')
    );
  }

  private syncExpandedMenus(url: string): void {
    for (const item of this.items()) {
      if (!item.children?.length) {
        continue;
      }
      for (const child of item.children) {
        if (child.route && url.startsWith(child.route)) {
          this.expandedMenus.update((set) => new Set([...set, item.label]));
          return;
        }
        if (child.children?.length) {
          const match = child.children.some((g) => g.route && url.startsWith(g.route));
          if (match) {
            this.expandedMenus.update(
              (set) => new Set([...set, item.label, this.menuKey(item, child)])
            );
            return;
          }
        }
      }
    }
  }

  private navigateToFirstRoute(item: MenuItem): void {
    const route = this.findFirstRoute(item);
    if (route && !this.router.url.startsWith(route)) {
      void this.router.navigateByUrl(route);
    }
  }

  private findFirstRoute(item: MenuItem): string | undefined {
    if (item.route) {
      return item.route;
    }
    for (const child of item.children ?? []) {
      const nested = this.findFirstRoute(child);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  onLogout(): void {
    this.authService.logout();
  }
}
