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

  it('alterna y persiste el modo claro', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.mode()).toBe('light');
    expect(localStorage.getItem('ultron-color-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
