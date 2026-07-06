import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { API_CONFIG } from '../../config/api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isLoginRequest = req.url === API_CONFIG.authLoginEndpoint;

  if (isLoginRequest) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
