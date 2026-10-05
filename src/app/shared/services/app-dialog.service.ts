import { Injectable, Type, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Observable, map } from 'rxjs';
import { GenericFormDialogComponent, GenericDialogData } from '../components/generic-form-dialog/generic-form-dialog';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly dialog = inject(Dialog);

  /**
   * Abre un componente formulario dentro de un modal genérico.
   * El click fuera del panel no cierra el diálogo (`appNoCloseOnOutside`).
   * El componente interno puede inyectar `DialogRef` (de @angular/cdk/dialog)
   * para cerrar el modal emitiendo un resultado, por ejemplo: `this.dialogRef.close(true)`
   */
  openForm<R = boolean>(
    component: Type<any>,
    data: Omit<GenericDialogData, 'component'>
  ): Observable<R | undefined> {
    const dialogRef = this.dialog.open<R>(GenericFormDialogComponent, {
      data: { ...data, component, closeOnBackdrop: data.closeOnBackdrop ?? false },
      hasBackdrop: false, // El <app-modal> tiene su propio backdrop (position: fixed)
      panelClass: 'app-dialog-transparent-panel',
    });

    return dialogRef.closed;
  }

  /** Diálogo de confirmación con el modal de la app. Emite true solo si se confirma. */
  confirm(message: string, title = 'Eliminar', confirmLabel = 'Eliminar'): Observable<boolean> {
    return this.openForm<boolean>(ConfirmDialogComponent, {
      title,
      maxWidth: '420px',
      inputs: { message, confirmLabel },
    }).pipe(map((result) => result === true));
  }

  /** Cierra todos los modales abiertos (p. ej. al mostrar el visor de reportes). */
  closeAll(): void {
    this.dialog.closeAll();
  }
}
