import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../services/notification.service';
import { NotificationContainerComponent } from './notification-container';

describe('NotificationContainerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationContainerComponent],
    });
  });

  it('al hacer clic en el aviso o en Actualizar ejecuta la acción una sola vez', () => {
    const notifications = TestBed.inject(NotificationService);
    let llamadas = 0;
    notifications.info('Hacé clic para actualizar.', {
      title: 'Hay una nueva versión',
      duration: 0,
      actionLabel: 'Actualizar',
      action: () => {
        llamadas += 1;
      },
    });
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('.toast__action') as HTMLButtonElement;
    boton.click();
    expect(llamadas).toBe(1);

    const aviso = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    aviso.click();
    expect(llamadas).toBe(2);
  });

  it('cerrar el aviso no dispara la actualización', () => {
    const notifications = TestBed.inject(NotificationService);
    let llamadas = 0;
    notifications.info('Hacé clic para actualizar.', {
      title: 'Hay una nueva versión',
      duration: 0,
      actionLabel: 'Actualizar',
      action: () => {
        llamadas += 1;
      },
    });
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const cerrar = fixture.nativeElement.querySelector('.toast__close') as HTMLButtonElement;
    cerrar.click();

    expect(llamadas).toBe(0);
    expect(notifications.notifications()).toHaveLength(0);
  });

  it('muestra la barra de avance', () => {
    const notifications = TestBed.inject(NotificationService);
    notifications.info('Descargando… 35%', {
      title: 'Actualizando',
      duration: 0,
      dismissible: false,
      progress: 35,
    });
    const fixture = TestBed.createComponent(NotificationContainerComponent);
    fixture.detectChanges();

    const barra = fixture.nativeElement.querySelector('.toast__progress > span') as HTMLElement;
    expect(barra.style.width).toBe('35%');
  });
});
