import { Injectable, signal, Type } from '@angular/core';

export interface TabData {
  id?: number;
  data?: any;
}

export interface Tab {
  id: number;
  title: string;
  component: Type<any>;
  active: boolean;
  tabData?: TabData;
}

@Injectable({
  providedIn: 'root'
})
export class TabService {
  readonly tabs = signal<Tab[]>([]);

  addTab(tab: Omit<Tab, 'id' | 'active'>): void {
    this.tabs.update(tabs => {
      const existsIndex = tabs.findIndex(t => t.title === tab.title);
      if (existsIndex >= 0) {
        return tabs.map((t, i) => ({
          ...t,
          active: i === existsIndex,
          tabData: tab.tabData || t.tabData
        }));
      }
      
      const newTab: Tab = {
        ...tab,
        id: tabs.length + 1,
        active: true
      };
      
      return [...tabs.map(t => ({ ...t, active: false })), newTab];
    });
  }

  removeTab(index: number): void {
    this.tabs.update(tabs => {
      const newTabs = [...tabs];
      newTabs.splice(index, 1);
      
      if (newTabs.length > 0 && !newTabs.some(t => t.active)) {
        // Si no hay tab activo, activar el último o el anterior al cerrado
        const targetIndex = index > 0 ? index - 1 : 0;
        if (newTabs[targetIndex]) {
          newTabs[targetIndex].active = true;
        }
      }
      
      return newTabs;
    });
  }

  setTabActive(index: number): void {
    this.tabs.update(tabs => 
      tabs.map((t, i) => ({ ...t, active: i === index }))
    );
  }

  removeAllTabs(): void {
    this.tabs.set([]);
  }
}
