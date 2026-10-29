import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError, timer } from 'rxjs';

/** Marca cuántas veces ya se reintentó esta petición ante un fallo de red. */
export const REINTENTOS_RED = new HttpContextToken<number>(() => 0);

const MAX_REINTENTOS = 1;
const ESPERA_MS = 400;

/**
 * Reintenta una vez las peticiones que fallan sin respuesta HTTP (status 0),
 * típico cuando la PC despertó y las conexiones quedaron colgadas.
 */
export const reintentarRedInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 0) {
        return throwError(() => error);
      }

      const intentos = req.context.get(REINTENTOS_RED);
      if (intentos >= MAX_REINTENTOS) {
        return throwError(() => error);
      }

      const reintento = req.clone({
        context: req.context.set(REINTENTOS_RED, intentos + 1),
      });

      return timer(ESPERA_MS).pipe(switchMap(() => next(reintento)));
    }),
  );
};
