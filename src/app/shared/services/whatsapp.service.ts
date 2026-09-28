import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

/**
 * Abre WhatsApp en el navegador y envía el PDF al chat que se elija.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  compartirArchivo(blob: Blob, nombreArchivo: string): Observable<void> {
    return from(this.abrirConArchivo(blob, nombreArchivo));
  }

  private async abrirConArchivo(blob: Blob, nombreArchivo: string): Promise<void> {
    const share = window.ultronDesktop?.shareWhatsAppFile;
    if (share) {
      const pdfBase64 = await blobToBase64(blob);
      const result = await share(pdfBase64, nombreArchivo);
      if (!result.success) {
        throw new Error(result.message || 'No se pudo abrir WhatsApp');
      }
      return;
    }

    const file = new File([blob], nombreArchivo, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }

    throw new Error('Abrí la aplicación de escritorio para compartir el PDF por WhatsApp');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64 = dataUrl.split(',')[1] ?? '';
      if (!base64) {
        reject(new Error('No se pudo leer el PDF'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el PDF'));
    reader.readAsDataURL(blob);
  });
}
