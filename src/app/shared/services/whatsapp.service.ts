import { Injectable } from '@angular/core';

export interface WhatsAppShareOptions {
  telefono: string;
  mensaje?: string;
  archivo?: Blob;
  nombreArchivo?: string;
}

/**
 * Servicio para compartir contenido por WhatsApp Web.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  /**
   * Abre WhatsApp Web con un mensaje predefinido para un número específico.
   * Si se proporciona un archivo, lo descarga automáticamente para que el usuario pueda adjuntarlo manualmente.
   */
  compartir(options: WhatsAppShareOptions): void {
    const { telefono, mensaje, archivo, nombreArchivo } = options;

    let textoCompleto = mensaje || '';

    if (archivo) {
      this.descargarArchivo(archivo, nombreArchivo || 'documento.pdf');
      
      if (textoCompleto) {
        textoCompleto += '\n\n';
      }
      textoCompleto += '📎 He descargado el archivo. Por favor, adjuntalo manualmente desde tu dispositivo.';
    }

    const mensajeCodificado = encodeURIComponent(textoCompleto);
    const url = `https://web.whatsapp.com/send?phone=${telefono}&text=${mensajeCodificado}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Descarga un archivo automáticamente en el navegador.
   */
  private descargarArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Valida si un número de teléfono es válido.
   */
  validarTelefono(telefono: string): boolean {
    const telefonoLimpio = telefono.replace(/[^\d]/g, '');
    return telefonoLimpio.length >= 10;
  }

  /**
   * Limpia un número de teléfono dejando solo dígitos.
   */
  limpiarTelefono(telefono: string): string {
    return telefono.replace(/[^\d]/g, '');
  }
}
