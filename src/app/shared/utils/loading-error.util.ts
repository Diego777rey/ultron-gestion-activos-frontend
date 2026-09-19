import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje por defecto cuando no hay red o el servidor no responde. */
export const NO_CONNECTION_MESSAGE = 'Sin conexión. Verifica tu red e inténtalo de nuevo.';

/**
 * Traduce un error HTTP/GraphQL/desconocido a un mensaje legible para la UI.
 */
export function resolveLoadingErrorMessage(
  err: unknown,
  fallback = NO_CONNECTION_MESSAGE,
): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return NO_CONNECTION_MESSAGE;
    }
    if (err.status >= 500) {
      return 'El servidor no responde. Inténtalo de nuevo en unos momentos.';
    }
    const bodyMessage = extractHttpBodyMessage(err);
    if (bodyMessage) {
      return bodyMessage;
    }
    return err.message?.trim() || fallback;
  }

  if (err instanceof Error) {
    const msg = err.message?.trim();
    if (!msg) {
      return fallback;
    }
    // Fallos típicos de red en navegador/Electron.
    if (/failed to fetch|networkerror|net::err|http failure response for .*:\s*0/i.test(msg)) {
      return NO_CONNECTION_MESSAGE;
    }
    return msg;
  }

  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }

  return fallback;
}

function extractHttpBodyMessage(err: HttpErrorResponse): string | undefined {
  const error = err.error;
  if (!error) {
    return undefined;
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }
  return undefined;
}
