import { TestBed } from '@angular/core/testing';
import { Pantalla } from './pantalla';

describe('Pantalla', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pantalla],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Pantalla);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
