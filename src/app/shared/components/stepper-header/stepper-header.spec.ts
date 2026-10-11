import { TestBed } from '@angular/core/testing';
import { StepperHeaderComponent, StepperStep } from './stepper-header';

describe('StepperHeaderComponent', () => {
  const steps: StepperStep[] = [
    { index: 1, label: 'Uno', icon: 'looks_one' },
    { index: 2, label: 'Dos', icon: 'looks_two' },
    { index: 3, label: 'Tres', icon: 'looks_3' },
  ];

  const crear = (inputs: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(StepperHeaderComponent);
    fixture.componentRef.setInput('steps', steps);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const pasos = Array.from(host.querySelectorAll<HTMLElement>('.stepper-step'));
    const conectores = Array.from(host.querySelectorAll<HTMLElement>('.stepper-connector'));
    return { fixture, host, pasos, conectores };
  };

  it('sin etapa alcanzada marca hechos los pasos anteriores y deja elegir cualquiera', () => {
    const { fixture, pasos, conectores } = crear({ currentStep: 2 });
    const elegidos: number[] = [];
    fixture.componentInstance.stepSelect.subscribe((i) => elegidos.push(i));

    expect(pasos.map((p) => p.classList.contains('done'))).toEqual([true, false, false]);
    expect(pasos[1].classList.contains('active')).toBe(true);
    expect(conectores.map((c) => c.classList.contains('done'))).toEqual([true, false]);
    expect(pasos.every((p) => !(p as HTMLButtonElement).disabled)).toBe(true);

    pasos[2].click();
    expect(elegidos).toEqual([3]);
  });

  it('con etapa alcanzada bloquea los pasos posteriores y marca la etapa al revisar otro paso', () => {
    const { pasos, conectores } = crear({ currentStep: 1, reachedStep: 2 });

    expect(pasos[0].classList.contains('active')).toBe(true);
    expect(pasos[0].classList.contains('done')).toBe(false);
    expect(pasos[1].classList.contains('reached')).toBe(true);
    expect(pasos.map((p) => (p as HTMLButtonElement).disabled)).toEqual([false, false, true]);
    expect(conectores.map((c) => c.classList.contains('done'))).toEqual([true, false]);
  });

  it('sin navegación muestra los pasos sin botones', () => {
    const { host } = crear({ currentStep: 2, navigable: false });
    expect(host.querySelectorAll('button').length).toBe(0);
    expect(host.querySelectorAll('.stepper-step').length).toBe(3);
  });

  it('aplica la variante de color', () => {
    const { host } = crear({ currentStep: 1, accent: 'success' });
    expect(host.classList.contains('stepper-header--success')).toBe(true);
  });
});
