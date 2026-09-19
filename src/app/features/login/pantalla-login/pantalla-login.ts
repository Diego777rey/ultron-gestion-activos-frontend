import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UppercaseDirective } from '../../../shared/directives/uppercase.directive';
import { normalizeLoginCredentials } from '../../../core/auth/auth.models';
import { LoadingService } from '../../../shared/services/loading.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { MIN_SUCCESS_DELAY_MS } from '../../../shared/models/loading.model';
import {
  NO_CONNECTION_MESSAGE,
  resolveLoadingErrorMessage,
} from '../../../shared/utils/loading-error.util';

@Component({
  selector: 'app-pantalla-login',
  standalone: true,
  imports: [ReactiveFormsModule, UppercaseDirective],
  templateUrl: './pantalla-login.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pantalla-login.scss',
})
export class PantallaLogin implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);
  private readonly notifications = inject(NotificationService);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  isPasswordVisible = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    this.authService.clearSession();
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((val) => !val);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials = normalizeLoginCredentials(this.loginForm.getRawValue());

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.loading
      .track(this.authService.login(credentials), {
        message: 'Iniciando sesión…',
        minSuccessDelayMs: MIN_SUCCESS_DELAY_MS,
        minErrorDelayMs: MIN_SUCCESS_DELAY_MS,
        notifyError: false,
        errorTitle: 'No se pudo iniciar sesión',
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(null);
          const name = (response.username || credentials.username).trim();
          this.notifications.success(
            name ? `¡Bienvenido, ${name}!` : '¡Bienvenido!',
            { title: 'Sesión iniciada', duration: 4000 },
          );
          void this.router.navigate(['/pantalla-principal']);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(this.resolveLoginError(err));
        },
      });
  }

  onClear(): void {
    this.loginForm.reset();
    this.errorMessage.set(null);
  }

  private resolveLoginError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return NO_CONNECTION_MESSAGE;
      }
      if (err.status === 401 || err.status === 403) {
        return 'Usuario o contraseña incorrectos.';
      }
    }
    return resolveLoadingErrorMessage(err, 'Usuario o contraseña incorrectos.');
  }
}
