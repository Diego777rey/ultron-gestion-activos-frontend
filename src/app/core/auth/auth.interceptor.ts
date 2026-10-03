import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { API_CONFIG } from '../../config/api.config';
import { ConectividadService } from '../conectividad/conectividad.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const conectividad = inject(ConectividadService);
  const esPublica =
    req.url === API_CONFIG.authLoginEndpoint || req.url === API_CONFIG.healthEndpoint;

  if (!esPublica) {
    const token = inject(AuthService).getToken();
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(req).pipe(
    tap({
      next: () => conectividad.registrarRespuesta(),
      error: (error: unknown) => conectividad.registrarFallo(error),
    }),
  );
};
