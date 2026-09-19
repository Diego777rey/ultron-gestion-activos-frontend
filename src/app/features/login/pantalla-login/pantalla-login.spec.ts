import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PantallaLogin } from './pantalla-login';
import { AuthService } from '../../../core/auth/auth.service';
import { LoadingService } from '../../../shared/services/loading.service';
import { NotificationService } from '../../../shared/services/notification.service';

describe('PantallaLogin', () => {
  let component: PantallaLogin;
  let fixture: ComponentFixture<PantallaLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantallaLogin],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            clearSession: vi.fn(),
            login: vi.fn(() => of({ token: 't', username: 'ADMIN' })),
            currentUsername: () => '',
          },
        },
        {
          provide: LoadingService,
          useValue: {
            track: <T>(source: T) => source,
          },
        },
        {
          provide: NotificationService,
          useValue: { success: vi.fn(), error: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PantallaLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
