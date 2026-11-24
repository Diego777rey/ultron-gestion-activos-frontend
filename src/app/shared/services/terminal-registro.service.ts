import { Injectable, inject } from '@angular/core';
import { DeviceIdentityService } from './device-identity.service';
import { TerminalService } from '../../features/financiero/terminales/services/terminal.service';

/**
 * Registra la MAC de esta PC en el backend apenas se abre la app Electron,
 * para que el admin pueda habilitarle una caja de forma remota.
 */
@Injectable({ providedIn: 'root' })
export class TerminalRegistroService {
  private readonly deviceIdentity = inject(DeviceIdentityService);
  private readonly terminalService = inject(TerminalService);
  private enCurso = false;
  private ultimaMacRegistrada: string | null = null;

  /** Idempotente: seguro llamar al boot, al volver en línea o tras login. */
  async registrarSiCorresponde(): Promise<void> {
    if (!this.deviceIdentity.disponible || this.enCurso) {
      return;
    }
    this.enCurso = true;
    try {
      const identity = await this.deviceIdentity.getIdentity();
      const mac = identity?.macAddress?.trim();
      if (!mac) {
        return;
      }
      if (this.ultimaMacRegistrada === mac) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        this.terminalService
          .registrar({
            macAddress: mac,
            hostname: identity?.hostname ?? null,
            plataforma: identity?.platform ?? null,
          })
          .subscribe({
            next: () => {
              this.ultimaMacRegistrada = mac;
              resolve();
            },
            error: (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))),
          });
      });
    } catch {
      // Sin red o backend caído: se reintenta en el próximo disparo.
    } finally {
      this.enCurso = false;
    }
  }
}
