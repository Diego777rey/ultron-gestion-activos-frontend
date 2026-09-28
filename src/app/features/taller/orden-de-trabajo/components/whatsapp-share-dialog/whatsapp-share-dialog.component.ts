import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';

export interface WhatsAppContact {
  nombre: string;
  telefono: string;
}

export interface WhatsAppShareResult {
  telefono: string;
  mensaje?: string;
}

@Component({
  selector: 'app-whatsapp-share-dialog',
  imports: [FormsModule],
  templateUrl: './whatsapp-share-dialog.component.html',
  styleUrl: './whatsapp-share-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappShareDialogComponent {
  private readonly dialogRef = inject(DialogRef<WhatsAppShareResult>);

  readonly contactoSugerido = input<WhatsAppContact | null>(null);
  
  protected readonly error = signal<string>('');
  protected telefonoManual = '';
  protected mensaje = '';

  constructor() {
    const contacto = this.contactoSugerido();
    if (contacto) {
      this.telefonoManual = contacto.telefono;
    }
  }

  protected usarContactoSugerido(): void {
    const contacto = this.contactoSugerido();
    if (contacto) {
      this.telefonoManual = contacto.telefono || '';
      this.error.set('');
    }
  }

  protected cerrar(): void {
    this.dialogRef.close();
  }

  protected compartir(): void {
    const telefono = this.telefonoManual.trim();

    if (!telefono) {
      this.error.set('Ingresá un número de teléfono');
      return;
    }

    const telefonoLimpio = telefono.replace(/[^\d]/g, '');

    if (telefonoLimpio.length < 10) {
      this.error.set('El número debe tener al menos 10 dígitos');
      return;
    }

    this.dialogRef.close({
      telefono: telefonoLimpio,
      mensaje: this.mensaje.trim() || undefined,
    } as WhatsAppShareResult);
  }
}
