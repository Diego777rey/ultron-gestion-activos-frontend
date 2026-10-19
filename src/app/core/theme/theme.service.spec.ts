import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  it('inicia en modo oscuro por defecto', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('mantiene el modo oscuro mientras el modo claro está deshabilitado', () => {
    localStorage.setItem('ultron-color-theme', 'light');
    const service = TestBed.inject(ThemeService);
    expect(service.lightModeEnabled).toBe(false);
    expect(service.mode()).toBe('dark');
    service.toggle();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
