import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map, tap } from 'rxjs';
import { AppDialogService } from './app-dialog.service';
import {
  CONFIGURACION_BACKUP_STORAGE_KEY,
  CONFIGURACION_STORAGE_KEY,
  ConfiguracionSistema,
  DEFAULT_CONFIGURACION,
  buildApiBaseUrl,
  readStoredConfiguracion,
} from '../models/configuracion-sistema.model';
import { ConfiguracionSistemaFormComponent } from '../components/configuracion-sistema-form/configuracion-sistema-form.component';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly dialogs = inject(AppDialogService);
  private config: ConfiguracionSistema | null = null;
  readonly configChanged = new Subject<ConfiguracionSistema>();

  constructor() {
    this.ensureConfigSynced();
  }

  getConfig(): ConfiguracionSistema {
    if (!this.config) {
      this.ensureConfigSynced();
    }
    return this.config ?? { ...DEFAULT_CONFIGURACION };
  }

  getApiBaseUrl(): string {
    const { serverIp, serverPort } = this.getConfig();
    return buildApiBaseUrl(serverIp, serverPort);
  }

  hasUserConfiguration(): boolean {
    return this.getConfig().isConfigured === true;
  }

  saveConfig(config: ConfiguracionSistema): void {
    const valid = this.validate(config);
    this.persist(valid);
    this.config = valid;
    this.configChanged.next(valid);
  }

  showConfigDialog(): Observable<boolean> {
    const current = this.getConfig();
    return this.dialogs
      .openForm<ConfiguracionSistema | undefined>(ConfiguracionSistemaFormComponent, {
        title: 'Configuración del Sistema',
        subtitle: 'Servidor backend e impresora térmica',
        maxWidth: '640px',
        closeOnBackdrop: false,
        closeOnEscape: false,
        inputs: {
          initial: current,
        },
      })
      .pipe(
        tap((result) => {
          if (result) {
            this.saveConfig({ ...result, isConfigured: true });
          }
        }),
        map((result) => !!result),
      );
  }

  private ensureConfigSynced(): void {
    this.config = readStoredConfiguracion() ?? { ...DEFAULT_CONFIGURACION };
  }

  private persist(config: ConfiguracionSistema): void {
    const payload = JSON.stringify(config);
    localStorage.setItem(CONFIGURACION_STORAGE_KEY, payload);
    localStorage.setItem(CONFIGURACION_BACKUP_STORAGE_KEY, payload);
  }

  private validate(config: Partial<ConfiguracionSistema>): ConfiguracionSistema {
    return {
      serverIp: (config.serverIp || DEFAULT_CONFIGURACION.serverIp).trim(),
      serverPort: (config.serverPort || DEFAULT_CONFIGURACION.serverPort).trim(),
      isConfigured: config.isConfigured === true,
      printers: {
        ticket: config.printers?.ticket?.trim() ?? DEFAULT_CONFIGURACION.printers.ticket,
      },
    };
  }
}
