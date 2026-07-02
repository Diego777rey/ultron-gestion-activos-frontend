import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-pantalla-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pantalla-login.html',
  styleUrl: './pantalla-login.scss',
})
export class PantallaLogin {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isPasswordVisible = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(val => !val);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    
    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.errorMessage.set(null);
        this.router.navigate(['/pantalla-principal']);
      },
      error: () => {
        this.errorMessage.set('Usuario o contraseña incorrectos.');
      }
    });
  }

  onClear(): void {
    this.loginForm.reset();
    this.errorMessage.set(null);
  }
}
