import { ChangeDetectionStrategy, Component, effect, input, model, output, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { DateRangeValue } from '../../models/date-range.model';

/**
 * Selector genérico de rango de fechas (desde / hasta).
 * Reutilizable en cualquier listado. El valor se bindea con `[(value)]`.
 */
@Component({
  selector: 'app-date-range-picker',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatDatepickerModule, MatIconModule],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-PY' },
    provideNativeDateAdapter(),
  ],
  templateUrl: './date-range-picker.html',
  styleUrl: './date-range-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'app-date-range-picker' },
})
export class DateRangePickerComponent {
  readonly label = input<string>('Rango de fecha');
  readonly startPlaceholder = input<string>('Desde');
  readonly endPlaceholder = input<string>('Hasta');
  readonly disabled = input<boolean>(false);
  readonly value = model<DateRangeValue>({ start: null, end: null });
  readonly closed = output<DateRangeValue>();

  protected readonly range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  constructor() {
    effect(() => {
      const next = this.value();
      const current = this.range.getRawValue();
      if (sameDay(current.start, next.start) && sameDay(current.end, next.end)) {
        return;
      }
      this.range.setValue(
        { start: next.start ?? null, end: next.end ?? null },
        { emitEvent: false },
      );
    });

    this.range.valueChanges.pipe(takeUntilDestroyed()).subscribe((val) => {
      this.value.set({
        start: val.start ?? null,
        end: val.end ?? null,
      });
    });
  }

  protected onClosed(): void {
    this.closed.emit(this.value());
  }
}

function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
