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
    this.tabs.update(tabs => {
      const newTabs = [...tabs];
      const removedTab = newTabs.splice(index, 1)[0];
      
      if (newTabs.length > 0 && removedTab.active) {
        const targetIndex = index > 0 ? index - 1 : 0;
        const targetTab = newTabs[targetIndex];
        if (targetTab) {
          targetTab.active = true;
          this.router.navigateByUrl(targetTab.url);
        }
      } else if (newTabs.length === 0) {
        this.router.navigateByUrl('/pantalla-principal');
      }
      
      return newTabs;
    });
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
}
