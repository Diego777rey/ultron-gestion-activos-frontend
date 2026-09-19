import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoadingService } from './loading.service';
import { NotificationService } from './notification.service';
import { MIN_ERROR_DELAY_MS, MIN_SUCCESS_DELAY_MS } from '../models/loading.model';
import { NO_CONNECTION_MESSAGE } from '../utils/loading-error.util';

describe('LoadingService', () => {
  let loading: LoadingService;
  let notifications: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notifications = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        LoadingService,
        { provide: NotificationService, useValue: notifications },
      ],
    });
    loading = TestBed.inject(LoadingService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides immediately on success', () => {
    let value: string | undefined;
    loading.track(of('ok'), { message: 'Guardando…' }).subscribe((v) => (value = v));

    expect(value).toBe('ok');
    expect(loading.visible()).toBe(false);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('keeps spinner for min success delay before emitting', () => {
    let value: string | undefined;
    loading
      .track(of('ok'), {
        message: 'Iniciando sesión…',
        minSuccessDelayMs: MIN_SUCCESS_DELAY_MS,
      })
      .subscribe((v) => (value = v));

    expect(value).toBeUndefined();
    expect(loading.visible()).toBe(true);

    vi.advanceTimersByTime(MIN_SUCCESS_DELAY_MS - 1);
    expect(value).toBeUndefined();
    expect(loading.visible()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(value).toBe('ok');
    expect(loading.visible()).toBe(false);
  });

  it('keeps spinner for min delay then notifies on error', () => {
    let sawError = false;
    loading
      .track(throwError(() => new Error('Failed to fetch')), {
        message: 'Guardando…',
        minErrorDelayMs: MIN_ERROR_DELAY_MS,
      })
      .subscribe({
        error: () => {
          sawError = true;
        },
      });

    expect(loading.visible()).toBe(true);
    expect(sawError).toBe(false);
    expect(notifications.error).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MIN_ERROR_DELAY_MS - 1);
    expect(loading.visible()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(loading.visible()).toBe(false);
    expect(sawError).toBe(true);
    expect(notifications.error).toHaveBeenCalledWith(
      NO_CONNECTION_MESSAGE,
      expect.objectContaining({ title: 'No se pudo completar' }),
    );
  });
});
