import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OlvidasteContrasenha } from './olvidaste-contrasenha';

describe('OlvidasteContrasenha', () => {
  let component: OlvidasteContrasenha;
  let fixture: ComponentFixture<OlvidasteContrasenha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OlvidasteContrasenha],
    }).compileComponents();

    fixture = TestBed.createComponent(OlvidasteContrasenha);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
