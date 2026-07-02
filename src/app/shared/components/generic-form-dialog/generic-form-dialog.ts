import { ChangeDetectionStrategy, Component, Inject, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ModalComponent } from '../modal/modal';

export interface GenericDialogData {
  title: string;
  subtitle?: string;
  maxWidth?: string;
  component: Type<any>;
  inputs?: Record<string, unknown>;
}

@Component({
  selector: 'app-generic-form-dialog',
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal
      [open]="true"
      [title]="data.title"
      [subtitle]="data.subtitle || ''"
      [maxWidth]="data.maxWidth || '560px'"
      (closed)="close()"
    >
      <ng-container *ngComponentOutlet="data.component; inputs: data.inputs || {}"></ng-container>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericFormDialogComponent {
  constructor(
    @Inject(DIALOG_DATA) public data: GenericDialogData,
    private dialogRef: DialogRef
  ) { }

  close(): void {
    this.dialogRef.close();
  }
}
