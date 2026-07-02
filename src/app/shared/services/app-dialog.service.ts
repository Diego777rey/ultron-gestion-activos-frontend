import { Injectable, Type, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { GenericFormDialogComponent, GenericDialogData } from '../components/generic-form-dialog/generic-form-dialog';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppDialogService {
  private readonly dialog = inject(Dialog);

  /**
   * Abre un componente formulario dentro de un modal genérico.
   * El componente interno puede inyectar `DialogRef` (de @angular/cdk/dialog)
   * para cerrar el modal emitiendo un resultado, por ejemplo: `this.dialogRef.close(true)`
   */
  openForm<R = boolean>(
    component: Type<any>,
    data: Omit<GenericDialogData, 'component'>
  ): Observable<R | undefined> {
    const dialogRef = this.dialog.open<R>(GenericFormDialogComponent, {
      data: { ...data, component },
      hasBackdrop: false, // El <app-modal> tiene su propio backdrop (position: fixed)
      panelClass: 'app-dialog-transparent-panel',
    });

    return dialogRef.closed;
  }
}
