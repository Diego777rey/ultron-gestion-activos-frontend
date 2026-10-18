import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

const STORAGE_KEY = 'ultron-color-theme';

/** El modo claro queda apagado hasta que el tema blanco esté listo. */
const LIGHT_MODE_ENABLED = false;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly lightModeEnabled = LIGHT_MODE_ENABLED;
  readonly mode = signal<ColorTheme>(this.readStoredTheme());
  readonly isLight = computed(() => this.mode() === 'light');
  readonly toggleIcon = computed(() => (this.isLight() ? 'dark_mode' : 'light_mode'));
  readonly toggleLabel = computed(() =>
    this.isLight() ? 'Activar modo oscuro' : 'Activar modo claro',
  );

  constructor() {
    if (!this.lightModeEnabled) {
      this.setMode('dark');
      return;
    }
    this.apply(this.mode());
  }

  toggle(): void {
    if (!this.lightModeEnabled) {
      return;
    }
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ColorTheme): void {
    if (!this.lightModeEnabled) {
      mode = 'dark';
    }
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
