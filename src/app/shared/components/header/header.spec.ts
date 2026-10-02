import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header';
import { version } from '../../../../../package.json';

describe('HeaderComponent', () => {
  it('muestra la versión del package.json, que es la que publica el release', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.app-version');
    expect(badge?.textContent?.trim()).toBe(`v${version}`);
  });
});
