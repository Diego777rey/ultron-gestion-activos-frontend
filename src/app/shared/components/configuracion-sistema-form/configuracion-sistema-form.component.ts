import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { startWith } from 'rxjs';
import { UiButtonComponent } from '../ui-button/ui-button';
import {
  ConfiguracionSistema,
  DEFAULT_CONFIGURACION,
} from '../../models/configuracion-sistema.model';
import { PrinterInfo } from '../../models/impresion.model';
import { ImpresionService } from '../../services/impresion.service';

@Component({
  selector: 'app-configuracion-sistema-form',
  imports: [ReactiveFormsModule, UiButtonComponent],
  templateUrl: './configuracion-sistema-form.component.html',
  styleUrl: './configuracion-sistema-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSistemaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly impresion = inject(ImpresionService);
  private readonly dialogRef = inject(DialogRef<ConfiguracionSistema | undefined>, { optional: true });

  readonly initial = input<ConfiguracionSistema | null>(null);

  protected readonly printers = signal<PrinterInfo[]>([]);
  protected readonly loadingPrinters = signal(false);
  protected readonly testingPrint = signal(false);
  protected readonly platformHint = computed(() => this.resolvePlatformHint());

  protected readonly form = this.fb.nonNullable.group({
    serverIp: [DEFAULT_CONFIGURACION.serverIp, [Validators.required, Validators.maxLength(255)]],
    serverPort: [
      DEFAULT_CONFIGURACION.serverPort,
      [Validators.required, Validators.pattern(/^\d{2,5}$/)],
    ],
    printerTicket: [DEFAULT_CONFIGURACION.printers.ticket],
  });

  protected readonly printerTicketValue = toSignal(
    this.form.controls.printerTicket.valueChanges.pipe(
      startWith(this.form.controls.printerTicket.value),
    ),
    { initialValue: this.form.controls.printerTicket.value },
  );

  constructor() {
    effect(() => {
      const value = this.initial();
      if (!value) {
        return;
      }
      this.form.reset({
        serverIp: value.serverIp,
        serverPort: value.serverPort,
        printerTicket: value.printers?.ticket ?? '',
      });
    });
  }

  ngOnInit(): void {
    this.loadPrinters();
  }

  protected loadPrinters(): void {
    this.loadingPrinters.set(true);
    this.impresion.listarImpresoras().subscribe({
      next: (printers) => {
        this.printers.set(printers);
        this.loadingPrinters.set(false);
        const current = this.form.controls.printerTicket.value?.trim();
        if (!current && printers.length > 0) {
          const preferred = printers.find((p) => p.isDefault) ?? printers[0];
          this.form.controls.printerTicket.setValue(preferred.name);
        }
      },
      error: () => {
        this.printers.set([]);
        this.loadingPrinters.set(false);
      },
    });
  }

  protected onPrinterSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.onSelectPrinter(target?.value ?? '');
  }

  protected onSelectPrinter(name: string): void {
    this.form.controls.printerTicket.setValue(name);
  }

  protected onTestPrint(): void {
    const printerName = this.form.controls.printerTicket.value.trim();
    if (!printerName || this.testingPrint()) {
      return;
    }
    this.testingPrint.set(true);
    this.impresion.imprimirPrueba(printerName).subscribe({
      next: () => this.testingPrint.set(false),
      error: () => this.testingPrint.set(false),
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef?.close({
      serverIp: raw.serverIp.trim(),
      serverPort: raw.serverPort.trim(),
      isConfigured: true,
      printers: {
        ticket: raw.printerTicket.trim(),
      },
    });
  }

  protected onCancel(): void {
    this.dialogRef?.close(undefined);
  }

  private resolvePlatformHint(): string {
    const platform = typeof window !== 'undefined' ? window.ultronDesktop?.platform : undefined;
    if (platform === 'win32') {
      return 'Windows usa la cola de impresión del sistema. Instalá la térmica como Generic / Text Only.';
    }
    if (platform === 'linux' || platform === 'darwin') {
      return 'Linux/macOS usa CUPS. Revisá las colas con lpstat -p. La térmica debe estar como raw o Generic.';
    }
    return 'En Linux la impresora se publica por CUPS; en Windows, por la cola del sistema.';
  }
}
