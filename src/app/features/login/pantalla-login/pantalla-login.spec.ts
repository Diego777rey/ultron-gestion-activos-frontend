import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PantallaLogin } from './pantalla-login';

describe('PantallaLogin', () => {
  let component: PantallaLogin;
  let fixture: ComponentFixture<PantallaLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantallaLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(PantallaLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
