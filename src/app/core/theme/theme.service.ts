import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

const STORAGE_KEY = 'ultron-color-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ColorTheme>(this.readStoredTheme());
  readonly isLight = computed(() => this.mode() === 'light');
  readonly toggleIcon = computed(() => (this.isLight() ? 'dark_mode' : 'light_mode'));
  readonly toggleLabel = computed(() =>
    this.isLight() ? 'Activar modo oscuro' : 'Activar modo claro',
  );

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ColorTheme): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* almacenamiento no disponible (modo privado, etc.) */
    }
    this.apply(mode);
  }

  private apply(mode: ColorTheme): void {
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  private readStoredTheme(): ColorTheme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
