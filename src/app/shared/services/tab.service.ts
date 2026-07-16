import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface Tab {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TabService {
  private readonly router = inject(Router);
  readonly tabs = signal<Tab[]>([]);

  addTab(title: string, url: string): void {
    this.tabs.update(tabs => {
      const existsIndex = tabs.findIndex(t => t.url === url);
      if (existsIndex >= 0) {
        return tabs.map((t, i) => ({
          ...t,
          active: i === existsIndex
        }));
      }
      
      const newTab: Tab = {
        id: Date.now(),
        title,
        url,
        active: true
      };
      
      return [...tabs.map(t => ({ ...t, active: false })), newTab];
    });
  }

  removeTab(index: number): void {
    const tabs = this.tabs();
    const removedTab = tabs[index];
    if (!removedTab) {
      return;
    }

    const newTabs = tabs.filter((_, i) => i !== index);

    // Al cerrar el último tab siempre volvemos al home.
    if (newTabs.length === 0) {
      this.tabs.set([]);
      this.router.navigateByUrl('/pantalla-principal');
      return;
    }

    if (removedTab.active) {
      const targetIndex = index > 0 ? index - 1 : 0;
      const activatedTabs = newTabs.map((t, i) => ({ ...t, active: i === targetIndex }));
      this.tabs.set(activatedTabs);
      this.router.navigateByUrl(activatedTabs[targetIndex].url);
    } else {
      this.tabs.set(newTabs);
    }
  }

  setTabActive(index: number): void {
    const tab = this.tabs()[index];
    if (tab) {
      this.router.navigateByUrl(tab.url);
    }
  }

  removeAllTabs(): void {
    this.tabs.set([]);
    this.router.navigateByUrl('/pantalla-principal');
  }

  clear(): void {
    this.tabs.set([]);
  }
}
