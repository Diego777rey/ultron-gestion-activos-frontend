import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UppercaseDirective } from '../../../shared/directives/uppercase.directive';
import { normalizeLoginCredentials } from '../../../core/auth/auth.models';

@Component({
  selector: 'app-pantalla-login',
  standalone: true,
  imports: [ReactiveFormsModule, UppercaseDirective],
  templateUrl: './pantalla-login.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pantalla-login.scss',
})
export class PantallaLogin implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

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

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set(null);
        this.router.navigate(['/pantalla-principal']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Usuario o contraseña incorrectos.');
      },
    });
  }

  onClear(): void {
    this.loginForm.reset();
    this.errorMessage.set(null);
  }
}
